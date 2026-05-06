import { handler } from "../../src/functions/login";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockLogin = jest.fn();

jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultAuthService: () => ({
        register: jest.fn(),
        login: (...args: unknown[]) => mockLogin(...args),
        refresh: jest.fn(),
        logout: jest.fn(),
        getById: jest.fn(),
    }),
}));

describe("login handler", () => {
    beforeEach(() => {
        mockLogin.mockReset();
    });

    it("returns 200 with session when credentials are valid", async () => {
        mockLogin.mockResolvedValue({
            success: true,
            value: {
                user: {
                    id: "u-1",
                    email: "user@example.com",
                    name: "Alice",
                    role: "CUSTOMER",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                },
                accessToken: "access-jwt",
                accessTokenExpiresAt: "2026-01-01T00:15:00.000Z",
                refreshToken: "rt.id",
                refreshTokenExpiresAt: "2026-01-31T00:00:00.000Z",
            },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/login",
            body: JSON.stringify({
                email: "user@example.com",
                password: "p",
            }),
            requestContext: { http: { method: "POST", path: "/auth/login" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        const body = parseLambdaJsonBody(result) as {
            data: { accessToken: string; refreshToken: string };
        };
        expect(body.data.accessToken).toBe("access-jwt");
        expect(body.data.refreshToken).toBe("rt.id");
    });

    it("returns 401 invalid credentials when service rejects", async () => {
        mockLogin.mockResolvedValue({
            success: false,
            failure: { kind: "invalid_credentials" },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/login",
            body: JSON.stringify({
                email: "user@example.com",
                password: "p",
            }),
            requestContext: { http: { method: "POST", path: "/auth/login" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        const body = parseLambdaJsonBody(result) as {
            message: string;
            traceId: string;
        };
        expect(body.message).toBe("Invalid credentials");
        expect(body.traceId).toBe("test-request-id");
    });
});
