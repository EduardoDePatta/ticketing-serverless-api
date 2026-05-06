import type { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2, } from "aws-lambda";
import { IdempotencyRepository } from "../repositories/idempotencyRepository";
import { OrderService } from "../services/orderService";
import { runWithIdempotency } from "../shared/http/idempotency";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { JsonObjectBodyValidation } from "../shared/http/jsonObjectBodyValidation";
import { requireAuth } from "../shared/http/requireAuth";
import { mapOrderServiceResult } from "../shared/mapOrderServiceResult";
const orderService = new OrderService();
const idempotencyRepository = new IdempotencyRepository();
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
    return runWithIdempotency({
        event,
        customerId: auth.ctx.userId,
        traceId,
        scope: "create_order",
        repository: idempotencyRepository,
        ttlSeconds: 24 * 60 * 60,
        exec: async (): Promise<APIGatewayProxyStructuredResultV2> => {
            const body = JsonObjectBodyValidation.parseOrBadRequest({
                rawBody: event.body,
                traceId,
            });
            if (!body.ok) {
                return body.response as APIGatewayProxyStructuredResultV2;
            }
            const result = await orderService.create({
                input: body.value,
                customerId: auth.ctx.userId,
            });
            return mapOrderServiceResult({
                result,
                successStatus: 201,
                traceId,
            }) as APIGatewayProxyStructuredResultV2;
        },
    });
};
