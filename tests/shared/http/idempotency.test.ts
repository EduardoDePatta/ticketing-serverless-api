import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, } from "aws-lambda";
import type { IdempotencyRepository } from "../../../src/repositories/idempotencyRepository";
import { buildIdempotencyRequestHash, runWithIdempotency, } from "../../../src/shared/http/idempotency";
import { buildHttpApiV2Event } from "../../helpers/httpApiV2Event";
import { parseLambdaJsonBody } from "../../helpers/parseLambdaBody";
function asStructured(response: unknown): APIGatewayProxyStructuredResultV2 {
    return response as APIGatewayProxyStructuredResultV2;
}
function makeRepo(): {
    repo: IdempotencyRepository;
    tryReserve: jest.Mock;
    complete: jest.Mock;
} {
    const tryReserve = jest.fn();
    const complete = jest.fn();
    return {
        repo: { tryReserve, complete } as unknown as IdempotencyRepository,
        tryReserve,
        complete,
    };
}
function eventWithHeaders(headers: Record<string, string>, body?: string): APIGatewayProxyEventV2 {
    return buildHttpApiV2Event({
        routeKey: "POST /orders",
        rawPath: "/orders",
        headers,
        body,
        requestContext: { http: { method: "POST", path: "/orders" } },
    });
}
describe("buildIdempotencyRequestHash", () => {
    it("matches for JSON that differs only in whitespace", () => {
        const compact = JSON.stringify({ eventId: "evt-1", quantity: 2 });
        const spaced = JSON.stringify({ eventId: "evt-1", quantity: 2 }, null, 4);
        expect(buildIdempotencyRequestHash({
            method: "POST",
            path: "/orders",
            body: compact,
        })).toBe(buildIdempotencyRequestHash({
            method: "POST",
            path: "/orders",
            body: spaced,
        }));
    });
    it("matches for JSON that differs only in object key order", () => {
        const a = '{"z":1,"a":2}';
        const b = '{"a":2,"z":1}';
        expect(buildIdempotencyRequestHash({
            method: "POST",
            path: "/orders",
            body: a,
        })).toBe(buildIdempotencyRequestHash({
            method: "POST",
            path: "/orders",
            body: b,
        }));
    });
});
describe("runWithIdempotency", () => {
    it("returns 400 when Idempotency-Key header is missing", async () => {
        const { repo, tryReserve, complete } = makeRepo();
        const exec = jest.fn();
        const event = eventWithHeaders({});
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date("2026-01-01T00:00:00.000Z"),
            exec,
        });
        expect(asStructured(r).statusCode).toBe(400);
        const body = parseLambdaJsonBody(r as {
            body: string;
        }) as {
            message: string;
        };
        expect(body.message).toContain("Idempotency-Key");
        expect(tryReserve).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        expect(exec).not.toHaveBeenCalled();
    });
    it("calls exec, caches response and returns its result on first request", async () => {
        const { repo, tryReserve, complete } = makeRepo();
        tryReserve.mockResolvedValue({ kind: "reserved" });
        const exec = jest.fn().mockResolvedValue({
            statusCode: 201,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: 201, message: "Created" }),
        });
        const event = eventWithHeaders({ "idempotency-key": "key-1" }, JSON.stringify({ a: 1 }));
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date("2026-01-01T00:00:00.000Z"),
            exec,
        });
        expect(asStructured(r).statusCode).toBe(201);
        expect(exec).toHaveBeenCalledTimes(1);
        expect(tryReserve).toHaveBeenCalledTimes(1);
        const reserveArgs = tryReserve.mock.calls[0][0];
        expect(reserveArgs.pk).toBe("create_order#u-1#key-1");
        expect(typeof reserveArgs.requestHash).toBe("string");
        expect(reserveArgs.requestHash.length).toBeGreaterThan(0);
        expect(complete).toHaveBeenCalledTimes(1);
        const completeArgs = complete.mock.calls[0][0];
        expect(completeArgs.pk).toBe("create_order#u-1#key-1");
        expect(completeArgs.statusCode).toBe(201);
        expect(typeof completeArgs.responseBody).toBe("string");
    });
    it("returns cached response on replay with same key and same payload", async () => {
        const { repo, tryReserve, complete } = makeRepo();
        tryReserve.mockResolvedValue({
            kind: "existing",
            record: {
                pk: "create_order#u-1#key-1",
                status: "completed",
                requestHash: "samehash",
                statusCode: 201,
                responseBody: JSON.stringify({ status: 201, replay: true }),
                createdAt: "2026-01-01T00:00:00.000Z",
                expiresAtEpoch: 1900000000,
            },
        });
        const exec = jest.fn();
        const event = eventWithHeaders({ "idempotency-key": "key-1" }, JSON.stringify({ a: 1 }));
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date(),
            exec,
            hashRequest: () => "samehash",
        });
        expect(exec).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        const structured = asStructured(r);
        expect(structured.statusCode).toBe(201);
        const body = parseLambdaJsonBody(r as {
            body: string;
        }) as {
            replay: boolean;
        };
        expect(body.replay).toBe(true);
    });
    it("returns 422 when same key is replayed with a different payload", async () => {
        const { repo, tryReserve } = makeRepo();
        tryReserve.mockResolvedValue({
            kind: "existing",
            record: {
                pk: "create_order#u-1#key-1",
                status: "completed",
                requestHash: "OLD",
                statusCode: 201,
                responseBody: "{}",
                createdAt: "2026-01-01T00:00:00.000Z",
                expiresAtEpoch: 1900000000,
            },
        });
        const exec = jest.fn();
        const event = eventWithHeaders({ "idempotency-key": "key-1" }, JSON.stringify({ a: 2 }));
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date(),
            exec,
            hashRequest: () => "NEW",
        });
        expect(asStructured(r).statusCode).toBe(422);
        expect(exec).not.toHaveBeenCalled();
    });
    it("returns 409 when a concurrent request is still in_progress", async () => {
        const { repo, tryReserve } = makeRepo();
        tryReserve.mockResolvedValue({
            kind: "existing",
            record: {
                pk: "create_order#u-1#key-1",
                status: "in_progress",
                requestHash: "samehash",
                statusCode: null,
                responseBody: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                expiresAtEpoch: 1900000000,
            },
        });
        const exec = jest.fn();
        const event = eventWithHeaders({ "idempotency-key": "key-1" }, JSON.stringify({ a: 1 }));
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date(),
            exec,
            hashRequest: () => "samehash",
        });
        expect(asStructured(r).statusCode).toBe(409);
        expect(exec).not.toHaveBeenCalled();
    });
    it("replays cached response when replay JSON is formatted differently but semantically identical", async () => {
        const firstBody = '{"quantity":2,"eventId":"evt-1"}';
        const storedCanonical = buildIdempotencyRequestHash({
            method: "POST",
            path: "/orders",
            body: firstBody,
        });
        const { repo, tryReserve, complete } = makeRepo();
        tryReserve.mockResolvedValue({
            kind: "existing",
            record: {
                pk: "create_order#u-1#key-1",
                status: "completed",
                requestHash: storedCanonical,
                statusCode: 201,
                responseBody: JSON.stringify({ status: 201, replay: true }),
                createdAt: "2026-01-01T00:00:00.000Z",
                expiresAtEpoch: 1900000000,
            },
        });
        const exec = jest.fn();
        const replayBody = JSON.stringify({ eventId: "evt-1", quantity: 2 }, null, 2);
        const event = eventWithHeaders({ "idempotency-key": "key-1" }, replayBody);
        const r = await runWithIdempotency({
            event,
            customerId: "u-1",
            traceId: "t-1",
            scope: "create_order",
            repository: repo,
            ttlSeconds: 60,
            now: () => new Date(),
            exec,
        });
        expect(exec).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        expect(asStructured(r).statusCode).toBe(201);
        const body = parseLambdaJsonBody(r as {
            body: string;
        }) as {
            replay: boolean;
        };
        expect(body.replay).toBe(true);
    });
});
