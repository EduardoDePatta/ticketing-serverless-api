import { handler } from "../../src/functions/register";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockRegister = jest.fn();

jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultAuthService: () => ({
        register: (...args: unknown[]) => mockRegister(...args),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        getById: jest.fn(),
    }),
}));

describe("register handler", () => {
    beforeEach(() => {
        mockRegister.mockReset();
    });

    it("returns 201 with the public user when service succeeds", async () => {
        mockRegister.mockResolvedValue({
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
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/register",
            body: JSON.stringify({
                email: "user@example.com",
                password: "Sup3rL0ngPassword!",
                name: "Alice",
                role: "CUSTOMER",
            }),
            requestContext: {
                http: { method: "POST", path: "/auth/register" },
            },
        });

        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(201);
        const body = parseLambdaJsonBody(result) as {
            data: { id: string; email: string };
        };
        expect(body.data.id).toBe("u-1");
        expect(body.data.email).toBe("user@example.com");
    });

    it("returns 400 on invalid JSON without calling the service", async () => {
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/register",
            body: "not-json",
            requestContext: {
                http: { method: "POST", path: "/auth/register" },
            },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        expect(mockRegister).not.toHaveBeenCalled();
    });

    it("returns 409 when email is already registered", async () => {
        mockRegister.mockResolvedValue({
            success: false,
            failure: { kind: "email_taken" },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/register",
            body: JSON.stringify({}),
            requestContext: {
                http: { method: "POST", path: "/auth/register" },
            },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(409);
        const body = parseLambdaJsonBody(result) as {
            message: string;
            traceId: string;
        };
        expect(body.message).toBe("Email already registered");
        expect(body.traceId).toBe("test-request-id");
    });

    it("returns 400 with field errors on validation failure", async () => {
        mockRegister.mockResolvedValue({
            success: false,
            failure: {
                kind: "validation",
                fields: { email: "Email must be a valid email address" },
            },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/register",
            body: JSON.stringify({}),
            requestContext: {
                http: { method: "POST", path: "/auth/register" },
            },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        const body = parseLambdaJsonBody(result) as {
            data: { errors: Record<string, string> };
        };
        expect(body.data.errors.email).toBeDefined();
    });
});
