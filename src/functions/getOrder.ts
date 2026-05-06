import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { OrderService } from "../services/orderService";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { requireAuth } from "../shared/http/requireAuth";
import { mapOrderServiceResult } from "../shared/mapOrderServiceResult";

const orderService = new OrderService();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const traceId = getHttpApiTraceId({ event });

    const auth = requireAuth({
        event,
        traceId,
        allowedRoles: ["CUSTOMER"],
    });
    if (!auth.ok) {
        return auth.response;
    }

    const id = event.pathParameters?.id ?? "";
    const result = await orderService.getById({
        id,
        customerId: auth.ctx.userId,
    });
    return mapOrderServiceResult({ result, successStatus: 200, traceId });
};
