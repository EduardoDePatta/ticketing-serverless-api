import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
export function getHttpApiTraceId(params: {
    event: APIGatewayProxyEventV2;
}): string {
    const id = params.event.requestContext.requestId;
    if (typeof id === "string" && id.trim().length > 0) {
        return id;
    }
    return randomUUID();
}
