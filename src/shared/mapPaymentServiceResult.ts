import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { PaidOrderResult, PaymentServiceResult } from "../services/paymentService";
import { apiErrorResponse, apiSuccessResponse } from "./http/apiResponse";

export function mapPaymentServiceResult(params: {
  result: PaymentServiceResult<PaidOrderResult>;
  traceId: string;
}): APIGatewayProxyStructuredResultV2 {
  const { result, traceId } = params;
  if (result.success) {
    return apiSuccessResponse({
      statusCode: 200,
      message: "Payment successful",
      data: {
        order: result.value.order,
        payment: result.value.payment,
      },
    }) as APIGatewayProxyStructuredResultV2;
  }

  switch (result.failure.kind) {
    case "validation":
      return apiErrorResponse({
        statusCode: 400,
        message: "Validation failed",
        data: { errors: result.failure.fields },
        traceId,
      }) as APIGatewayProxyStructuredResultV2;
    case "order_not_found":
      return apiErrorResponse({
        statusCode: 404,
        message: "Order not found",
        data: null,
        traceId,
      }) as APIGatewayProxyStructuredResultV2;
    case "invalid_state":
      return apiErrorResponse({
        statusCode: 409,
        message: `Order is not payable in its current state (${result.failure.currentStatus})`,
        data: { currentStatus: result.failure.currentStatus },
        traceId,
      }) as APIGatewayProxyStructuredResultV2;
    case "expired":
      return apiErrorResponse({
        statusCode: 409,
        message: "Order has expired",
        data: null,
        traceId,
      }) as APIGatewayProxyStructuredResultV2;
    case "charge_failed":
      return apiErrorResponse({
        statusCode: 402,
        message:
          result.failure.outcome === "declined"
            ? "Payment was declined by the card issuer"
            : "Payment processing error",
        data: {
          outcome: result.failure.outcome,
          reason: result.failure.reason ?? null,
          payment: result.failure.payment,
        },
        traceId,
      }) as APIGatewayProxyStructuredResultV2;
  }
}
