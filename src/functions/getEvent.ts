import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { EventService } from "../services/eventService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { mapEventServiceResult } from "../shared/mapEventServiceResult";

const eventService = new EventService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const traceId = getHttpApiTraceId({ event });
    const id = event.pathParameters?.id ?? "";
    const result = await eventService.getById({ id });
    return mapEventServiceResult({ result, successStatus: 200, traceId });
};
