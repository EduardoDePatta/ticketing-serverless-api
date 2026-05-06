import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/me";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockGetById = jest.fn();
jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultAuthService: () => ({
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        getById: (...args: unknown[]) => mockGetById(...args),
    }),
}));
function eventWithAuth(params: {
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "GET /auth/me",
        requestContext: { http: { method: "GET", path: "/auth/me" } },
    });
    const requestContext = event.requestContext as unknown as {
        authorizer?: {
            lambda?: Record<string, unknown>;
        };
    };
    requestContext.authorizer = {
        lambda: {
            userId: params.userId,
            role: params.role,
        },
    };
    return event;
}
describe("me handler", () => {
    beforeEach(() => {
        mockGetById.mockReset();
    });
    it("returns 401 when authorizer context is missing", async () => {
        const event = buildHttpApiV2Event({
            routeKey: "GET /auth/me",
            requestContext: { http: { method: "GET", path: "/auth/me" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockGetById).not.toHaveBeenCalled();
    });
    it("returns 401 when role in context is not a known role", async () => {
        const event = eventWithAuth({ userId: "u-1", role: "ADMIN" });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockGetById).not.toHaveBeenCalled();
    });
    it("returns 200 with user data when context is present", async () => {
        mockGetById.mockResolvedValue({
            success: true,
            value: {
                id: "u-1",
                email: "user@example.com",
                name: "Alice",
                role: "CUSTOMER",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            },
        });
        const event = eventWithAuth({ userId: "u-1", role: "CUSTOMER" });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        expect(mockGetById).toHaveBeenCalledWith({ id: "u-1" });
        const body = parseLambdaJsonBody(result) as {
            data: {
                id: string;
                email: string;
            };
        };
        expect(body.data.id).toBe("u-1");
    });
    it("returns 404 when user no longer exists", async () => {
        mockGetById.mockResolvedValue({
            success: false,
            failure: { kind: "user_not_found" },
        });
        const event = eventWithAuth({ userId: "u-1", role: "CUSTOMER" });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(404);
        const body = parseLambdaJsonBody(result) as {
            message: string;
        };
        expect(body.message).toBe("User not found");
    });
});
