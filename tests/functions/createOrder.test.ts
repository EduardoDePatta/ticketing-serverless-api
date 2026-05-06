import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { handler } from "../../src/functions/createOrder";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockCreate = jest.fn();
const mockTryReserve = jest.fn();
const mockComplete = jest.fn();

jest.mock("../../src/services/orderService", () => ({
    OrderService: jest.fn().mockImplementation(() => ({
        create: (...args: unknown[]) => mockCreate(...args),
        getById: jest.fn(),
    })),
}));

jest.mock("../../src/repositories/idempotencyRepository", () => ({
    IdempotencyRepository: jest.fn().mockImplementation(() => ({
        tryReserve: (...args: unknown[]) => mockTryReserve(...args),
        complete: (...args: unknown[]) => mockComplete(...args),
    })),
}));

function eventWithAuth(params: {
    body?: string;
    headers?: Record<string, string>;
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "POST /orders",
        rawPath: "/orders",
        body: params.body,
        headers: params.headers ?? {},
        requestContext: { http: { method: "POST", path: "/orders" } },
    });
    if (params.userId !== undefined || params.role !== undefined) {
        const requestContext = event.requestContext as unknown as {
            authorizer?: { lambda?: Record<string, unknown> };
        };
        requestContext.authorizer = {
            lambda: { userId: params.userId, role: params.role },
        };
    }
    return event;
}

describe("createOrder handler", () => {
    beforeEach(() => {
        mockCreate.mockReset();
        mockTryReserve.mockReset();
        mockComplete.mockReset();
    });

    it("returns 401 when authorizer context is missing", async () => {
        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            headers: { "idempotency-key": "k-1" },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockTryReserve).not.toHaveBeenCalled();
    });

    it("returns 403 when caller is an ORGANIZER", async () => {
        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            headers: { "idempotency-key": "k-1" },
            userId: "u-1",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(403);
        expect(mockTryReserve).not.toHaveBeenCalled();
    });

    it("returns 400 when Idempotency-Key header is missing", async () => {
        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        const body = parseLambdaJsonBody(result) as { message: string };
        expect(body.message).toContain("Idempotency-Key");
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockTryReserve).not.toHaveBeenCalled();
    });

    it("returns 400 when body is invalid JSON (after reserving)", async () => {
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        mockComplete.mockResolvedValue(undefined);
        const event = eventWithAuth({
            body: "not-json",
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("forwards customerId from authorizer to service and returns 201 on success", async () => {
        const created = {
            id: "ord-1",
            customerId: "u-cust",
            eventId: "evt-1",
            quantity: 2,
            status: "PENDING" as const,
            totalAmountInCents: 2000,
            currency: "USD",
            expiresAt: "2026-01-01T00:30:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        };
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        mockComplete.mockResolvedValue(undefined);
        mockCreate.mockResolvedValue({ success: true, value: created });

        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(201);
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            input: { eventId: "evt-1", quantity: 2 },
            customerId: "u-cust",
        });
        expect(mockComplete).toHaveBeenCalledTimes(1);
        const body = parseLambdaJsonBody(result) as { data: typeof created };
        expect(body.data?.id).toBe("ord-1");
    });

    it("returns 409 when sold out", async () => {
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        mockComplete.mockResolvedValue(undefined);
        mockCreate.mockResolvedValue({
            success: false,
            failure: { kind: "sold_out" },
        });
        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(409);
        const body = parseLambdaJsonBody(result) as { message: string };
        expect(body.message).toBe("Not enough tickets available");
    });

    it("replays cached response when same key + payload is reused", async () => {
        mockTryReserve.mockImplementation(async (params: {
            requestHash: string;
        }) => ({
            kind: "existing",
            record: {
                pk: "x",
                status: "completed",
                requestHash: params.requestHash,
                statusCode: 201,
                responseBody: JSON.stringify({
                    status: 201,
                    message: "Created",
                    data: { id: "ord-1" },
                }),
                createdAt: "x",
                expiresAtEpoch: 0,
            },
        }));

        const event = eventWithAuth({
            body: JSON.stringify({ eventId: "evt-1", quantity: 2 }),
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(201);
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockComplete).not.toHaveBeenCalled();
        const body = parseLambdaJsonBody(result) as {
            data: { id: string };
        };
        expect(body.data.id).toBe("ord-1");
    });
});
