import type { APIGatewayRequestAuthorizerEventV2 } from "aws-lambda";

import { handler } from "../../src/functions/authorizer";

const mockVerify = jest.fn();

jest.mock("../../src/shared/auth/authServiceFactory", () => ({
    getDefaultJwtAccessTokens: () => ({
        sign: jest.fn(),
        verify: (...args: unknown[]) => mockVerify(...args),
    }),
}));

function buildAuthorizerEvent(params: {
    authorization?: string;
}): APIGatewayRequestAuthorizerEventV2 {
    return {
        version: "2.0",
        type: "REQUEST",
        routeArn: "arn:aws:execute-api:us-east-1:123:abc/dev/GET/auth/me",
        identitySource: params.authorization ? [params.authorization] : [],
        routeKey: "GET /auth/me",
        rawPath: "/auth/me",
        rawQueryString: "",
        headers: params.authorization
            ? { authorization: params.authorization }
            : {},
        requestContext: {
            accountId: "123",
            apiId: "test",
            domainName: "test.example.com",
            domainPrefix: "test",
            http: {
                method: "GET",
                path: "/auth/me",
                protocol: "HTTP/1.1",
                sourceIp: "127.0.0.1",
                userAgent: "jest",
            },
            requestId: "req-1",
            routeKey: "GET /auth/me",
            stage: "dev",
            time: "01/Jan/2026:00:00:00 +0000",
            timeEpoch: 1735689600000,
        },
    } as APIGatewayRequestAuthorizerEventV2;
}

describe("authorizer", () => {
    beforeEach(() => {
        mockVerify.mockReset();
    });

    it("denies when Authorization header is missing", async () => {
        const result = await handler(buildAuthorizerEvent({}));
        expect(result.isAuthorized).toBe(false);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    it("denies when Authorization header does not start with Bearer", async () => {
        const result = await handler(
            buildAuthorizerEvent({ authorization: "Basic abc" })
        );
        expect(result.isAuthorized).toBe(false);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    it("denies when JWT verify rejects", async () => {
        mockVerify.mockResolvedValue({ ok: false });
        const result = await handler(
            buildAuthorizerEvent({ authorization: "Bearer bad-token" })
        );
        expect(result.isAuthorized).toBe(false);
    });

    it("allows and exposes userId/role in context when JWT verifies", async () => {
        mockVerify.mockResolvedValue({
            ok: true,
            payload: { userId: "u-1", role: "ORGANIZER" },
        });
        const result = await handler(
            buildAuthorizerEvent({ authorization: "Bearer good-token" })
        );
        expect(result.isAuthorized).toBe(true);
        expect(result.context).toEqual({
            userId: "u-1",
            role: "ORGANIZER",
        });
    });

    it("accepts case-insensitive Bearer prefix", async () => {
        mockVerify.mockResolvedValue({
            ok: true,
            payload: { userId: "u-1", role: "CUSTOMER" },
        });
        const result = await handler(
            buildAuthorizerEvent({ authorization: "bearer good-token" })
        );
        expect(result.isAuthorized).toBe(true);
    });
});
