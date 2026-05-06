import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function parseLambdaJsonBody(
    result: APIGatewayProxyStructuredResultV2
): unknown {
    const raw = result.body;
    if (raw === undefined) {
        throw new Error("Response has no body");
    }
    return JSON.parse(raw);
}
