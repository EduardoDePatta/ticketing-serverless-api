import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { EventService } from "../services/eventService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { requireAuth } from "../shared/http/requireAuth";
import { mapEventServiceResult } from "../shared/mapEventServiceResult";

const eventService = new EventService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const traceId = getHttpApiTraceId({ event });
  const auth = requireAuth({
    event,
    traceId,
    allowedRoles: ["ORGANIZER"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  const id = event.pathParameters?.id ?? "";
  const result = await eventService.delete({
    id,
    actorId: auth.ctx.userId,
  });
  return mapEventServiceResult({ result, successStatus: 200, traceId });
};
