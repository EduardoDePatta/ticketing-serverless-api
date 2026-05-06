import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { requireAuth } from "../../../src/shared/http/requireAuth";
import { buildHttpApiV2Event } from "../../helpers/httpApiV2Event";
import { parseLambdaJsonBody } from "../../helpers/parseLambdaBody";

function asStructured(
    response: unknown
): APIGatewayProxyStructuredResultV2 {
    return response as APIGatewayProxyStructuredResultV2;
}

function eventWithLambda(params: {
    userId?: unknown;
    role?: unknown;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "GET /protected",
        requestContext: { http: { method: "GET", path: "/protected" } },
    });
    (
        event.requestContext as unknown as {
            authorizer?: { lambda?: Record<string, unknown> };
        }
    ).authorizer = {
        lambda: {
            userId: params.userId,
            role: params.role,
        },
    };
    return event;
}

describe("requireAuth", () => {
    it("returns 401 when authorizer context is absent", () => {
        const event = buildHttpApiV2Event({
            routeKey: "GET /protected",
            requestContext: { http: { method: "GET", path: "/protected" } },
        });
        const r = requireAuth({ event, traceId: "trace-1" });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(asStructured(r.response).statusCode).toBe(401);
            const body = parseLambdaJsonBody(
                r.response as { body: string }
            ) as { message: string; traceId: string };
            expect(body.message).toBe("Unauthorized");
            expect(body.traceId).toBe("trace-1");
        }
    });

    it("returns 401 when role is unknown", () => {
        const event = eventWithLambda({ userId: "u-1", role: "ADMIN" });
        const r = requireAuth({ event, traceId: "trace-1" });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(asStructured(r.response).statusCode).toBe(401);
        }
    });

    it("returns 401 when userId is missing", () => {
        const event = eventWithLambda({ userId: "", role: "CUSTOMER" });
        const r = requireAuth({ event, traceId: "trace-1" });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(asStructured(r.response).statusCode).toBe(401);
        }
    });

    it("returns 403 when role is not in allowedRoles", () => {
        const event = eventWithLambda({ userId: "u-1", role: "CUSTOMER" });
        const r = requireAuth({
            event,
            traceId: "trace-1",
            allowedRoles: ["ORGANIZER"],
        });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(asStructured(r.response).statusCode).toBe(403);
            const body = parseLambdaJsonBody(
                r.response as { body: string }
            ) as { message: string; traceId: string };
            expect(body.message).toBe("Forbidden");
            expect(body.traceId).toBe("trace-1");
        }
    });

    it("returns ctx when authenticated and allowedRoles is omitted", () => {
        const event = eventWithLambda({ userId: "u-1", role: "CUSTOMER" });
        const r = requireAuth({ event, traceId: "trace-1" });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.ctx).toEqual({ userId: "u-1", role: "CUSTOMER" });
        }
    });

    it("returns ctx when role is in allowedRoles", () => {
        const event = eventWithLambda({ userId: "u-1", role: "ORGANIZER" });
        const r = requireAuth({
            event,
            traceId: "trace-1",
            allowedRoles: ["ORGANIZER", "CUSTOMER"],
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.ctx.role).toBe("ORGANIZER");
        }
    });
});
