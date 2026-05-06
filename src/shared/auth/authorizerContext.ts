import type { APIGatewayProxyEventV2 } from "aws-lambda";

import { Role } from "../../entities/user";

export interface AuthorizerContext {
    userId: string;
    role: Role;
}

export function readAuthorizerContext(params: {
    event: APIGatewayProxyEventV2;
}): AuthorizerContext | null {
    const requestContext = params.event.requestContext as unknown as {
        authorizer?: {
            lambda?: { userId?: unknown; role?: unknown };
        };
    };
    const lambda = requestContext.authorizer?.lambda;
    if (!lambda) {
        return null;
    }
    const userId = typeof lambda.userId === "string" ? lambda.userId : null;
    const role = lambda.role;
    if (!userId || (role !== "ORGANIZER" && role !== "CUSTOMER")) {
        return null;
    }
    return { userId, role };
}
