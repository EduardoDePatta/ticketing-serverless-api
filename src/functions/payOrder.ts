import type { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { IdempotencyRepository } from "../repositories/idempotencyRepository";
import { PaymentService } from "../services/paymentService";
import { runWithIdempotency } from "../shared/http/idempotency";
import { getHttpApiTraceId } from "../shared/http/httpApiTraceId";
import { JsonObjectBodyValidation } from "../shared/http/jsonObjectBodyValidation";
import { requireAuth } from "../shared/http/requireAuth";
import { mapPaymentServiceResult } from "../shared/mapPaymentServiceResult";

const paymentService = new PaymentService();
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
    scope: "pay_order",
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

      const orderId = event.pathParameters?.id ?? "";
      const result = await paymentService.payOrder({
        orderId,
        customerId: auth.ctx.userId,
        input: body.value,
      });
      return mapPaymentServiceResult({ result, traceId });
    },
  });
};
