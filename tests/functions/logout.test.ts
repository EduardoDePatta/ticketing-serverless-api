import { handler } from "../../src/functions/logout";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";

const mockLogout = jest.fn();

jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultAuthService: () => ({
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: (...args: unknown[]) => mockLogout(...args),
        getById: jest.fn(),
    }),
}));

describe("logout handler", () => {
    beforeEach(() => {
        mockLogout.mockReset();
    });

    it("returns 204 when service reports success", async () => {
        mockLogout.mockResolvedValue({ success: true, value: undefined });
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/logout",
            body: JSON.stringify({ refreshToken: "rt.secret" }),
            requestContext: { http: { method: "POST", path: "/auth/logout" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(204);
    });

    it("returns 400 when JSON body is invalid", async () => {
        const event = buildHttpApiV2Event({
            routeKey: "POST /auth/logout",
            body: "not-json",
            requestContext: { http: { method: "POST", path: "/auth/logout" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        expect(mockLogout).not.toHaveBeenCalled();
    });
});
