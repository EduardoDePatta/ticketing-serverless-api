import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getDefaultAuthService } from "../shared/auth/authServiceFactory";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { JsonObjectBodyValidation } from "../shared/http/jsonObjectBodyValidation";
import { mapAuthServiceResult } from "../shared/mapAuthServiceResult";
const authService = getDefaultAuthService();
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const traceId = getHttpApiTraceId({ event });
    const body = JsonObjectBodyValidation.parseOrBadRequest({
        rawBody: event.body,
        traceId,
    });
    if (!body.ok) {
        return body.response;
    }
    const result = await authService.login({ input: body.value });
    return mapAuthServiceResult({ result, success: "ok", traceId });
};
