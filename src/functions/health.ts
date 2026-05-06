import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { apiSuccessResponse } from "../shared/http/apiResponse";
export const handler: APIGatewayProxyHandlerV2 = async () => {
    return apiSuccessResponse({
        statusCode: 200,
        message: "OK",
        data: {
            service: "ticketing-api",
            timestamp: new Date().toISOString(),
        },
    });
};
