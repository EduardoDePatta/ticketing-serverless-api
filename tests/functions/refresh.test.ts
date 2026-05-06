import { handler } from "../../src/functions/refresh";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockRefresh = jest.fn();

jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultAuthService: () => ({
        register: jest.fn(),
        login: jest.fn(),
        refresh: (...args: unknown[]) => mockRefresh(...args),
        logout: jest.fn(),
        getById: jest.fn(),
    }),
}));

describe("refresh handler", () => {
    beforeEach(() => {
        mockRefresh.mockReset();
    });

    it("returns 200 with new tokens when refresh succeeds", async () => {
        mockRefresh.mockResolvedValue({
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
                accessToken: "new-access-jwt",
                accessTokenExpiresAt: "2026-01-01T00:15:00.000Z",
                refreshToken: "new-rt.id",
                refreshTokenExpiresAt: "2026-01-31T00:00:00.000Z",
            },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/refresh",
            body: JSON.stringify({ refreshToken: "rt-1.secret" }),
            requestContext: { http: { method: "POST", path: "/auth/refresh" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        const body = parseLambdaJsonBody(result) as {
            data: { accessToken: string; refreshToken: string };
        };
        expect(body.data.accessToken).toBe("new-access-jwt");
    });

    it("returns 401 when refresh token is invalid", async () => {
        mockRefresh.mockResolvedValue({
            success: false,
            failure: { kind: "invalid_refresh_token" },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/refresh",
            body: JSON.stringify({ refreshToken: "x.y" }),
            requestContext: { http: { method: "POST", path: "/auth/refresh" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        const body = parseLambdaJsonBody(result) as { message: string };
        expect(body.message).toBe("Invalid refresh token");
    });

    it("returns 401 with reuse-detected message when family is compromised", async () => {
        mockRefresh.mockResolvedValue({
            success: false,
            failure: { kind: "reuse_detected" },
        });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/refresh",
            body: JSON.stringify({ refreshToken: "x.y" }),
            requestContext: { http: { method: "POST", path: "/auth/refresh" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        const body = parseLambdaJsonBody(result) as { message: string };
        expect(body.message).toBe("Refresh token reuse detected");
    });
});
