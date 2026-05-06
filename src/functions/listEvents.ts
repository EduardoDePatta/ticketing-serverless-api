import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { EventService } from "../services/eventService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { mapEventServiceResult } from "../shared/mapEventServiceResult";

const eventService = new EventService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const traceId = getHttpApiTraceId({ event });
  const result = await eventService.list();
  return mapEventServiceResult({ result, successStatus: 200, traceId });
};
