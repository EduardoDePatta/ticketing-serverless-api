import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { EventService } from "../services/eventService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { JsonObjectBodyValidation } from "../shared/http/jsonObjectBodyValidation";
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
    const body = JsonObjectBodyValidation.parseOrBadRequest({
        rawBody: event.body,
        traceId,
    });
    if (!body.ok) {
        return body.response;
    }
    const result = await eventService.create({
        input: body.value,
        organizerId: auth.ctx.userId,
    });
    return mapEventServiceResult({ result, successStatus: 201, traceId });
};
