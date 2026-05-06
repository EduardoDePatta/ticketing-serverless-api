import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
} from "aws-lambda";

import { Role } from "../../entities/user";
import {
    AuthorizerContext,
    readAuthorizerContext,
} from "../auth/authorizerContext";
import { apiErrorResponse } from "./apiResponse";

export type RequireAuthResult =
    | { ok: true; ctx: AuthorizerContext }
    | { ok: false; response: APIGatewayProxyResultV2 };

export function requireAuth(params: {
    event: APIGatewayProxyEventV2;
    traceId: string;
    allowedRoles?: readonly Role[];
}): RequireAuthResult {
    const { event, traceId, allowedRoles } = params;
    const ctx = readAuthorizerContext({ event });
    if (!ctx) {
        return {
            ok: false,
            response: apiErrorResponse({
                statusCode: 401,
                message: "Unauthorized",
                data: null,
                traceId,
            }),
        };
    }
    if (allowedRoles && !allowedRoles.includes(ctx.role)) {
        return {
            ok: false,
            response: apiErrorResponse({
                statusCode: 403,
                message: "Forbidden",
                data: null,
                traceId,
            }),
        };
    }
    return { ok: true, ctx };
}
