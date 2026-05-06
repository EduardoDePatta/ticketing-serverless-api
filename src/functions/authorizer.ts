import type {
    APIGatewayRequestAuthorizerEventV2,
    APIGatewaySimpleAuthorizerWithContextResult,
} from "aws-lambda";

import { Role } from "../entities/user";
import { getDefaultJwtAccessTokens } from "../shared/auth/authServiceFactory";

export interface AuthorizerSimpleContext {
    userId: string;
    role: Role;
    [key: string]: string;
}

const jwtAccessTokens = getDefaultJwtAccessTokens();

const DENY: APIGatewaySimpleAuthorizerWithContextResult<AuthorizerSimpleContext> =
    {
        isAuthorized: false,
        context: { userId: "", role: "CUSTOMER" },
    };

export const handler = async (
    event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewaySimpleAuthorizerWithContextResult<AuthorizerSimpleContext>> => {
    const headers = event.headers ?? {};
    const headerValue =
        headers.authorization ??
        headers.Authorization ??
        (headers as Record<string, string | undefined>)["AUTHORIZATION"];

    if (typeof headerValue !== "string" || headerValue.length === 0) {
        return DENY;
    }

    const match = headerValue.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return DENY;
    }

    const token = match[1].trim();
    if (!token) {
        return DENY;
    }

    const result = await jwtAccessTokens.verify({ token });
    if (!result.ok) {
        return DENY;
    }

    return {
        isAuthorized: true,
        context: {
            userId: result.payload.userId,
            role: result.payload.role,
        },
    };
};
