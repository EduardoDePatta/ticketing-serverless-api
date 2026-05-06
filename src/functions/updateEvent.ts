import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { EventService } from "../services/eventService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { JsonObjectBodyValidation } from "../shared/http/jsonObjectBodyValidation";
import { mapEventServiceResult } from "../shared/mapEventServiceResult";

const eventService = new EventService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const traceId = getHttpApiTraceId({ event });
    const body = JsonObjectBodyValidation.parseOrBadRequest({
        rawBody: event.body,
        traceId,
    });
    if (!body.ok) {
        return body.response;
    }

    const id = event.pathParameters?.id ?? "";
    const result = await eventService.update({
        id,
        input: body.value,
    });
    return mapEventServiceResult({ result, successStatus: 200, traceId });
};
