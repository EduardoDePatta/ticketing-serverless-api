import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Ticketing API is running",
            timestamp: new Date().toISOString(),
        }),
    };
};
