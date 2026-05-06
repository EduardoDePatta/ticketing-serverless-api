import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getDefaultAuthService } from "../shared/auth/authServiceFactory";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { requireAuth } from "../shared/http/requireAuth";
import { mapAuthServiceResult } from "../shared/mapAuthServiceResult";

const authService = getDefaultAuthService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const traceId = getHttpApiTraceId({ event });
  const auth = requireAuth({ event, traceId });
  if (!auth.ok) {
    return auth.response;
  }

  const result = await authService.getById({ id: auth.ctx.userId });
  return mapAuthServiceResult({ result, success: "ok", traceId });
};
