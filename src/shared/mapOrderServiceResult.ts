import type { APIGatewayProxyResultV2 } from "aws-lambda";
import type { OrderServiceResult } from "../services/orderService";
import { apiErrorResponse, apiSuccessResponse } from "./http/apiResponse";

export function mapOrderServiceResult<T>(params: {
  result: OrderServiceResult<T>;
  successStatus: number;
  traceId: string;
}): APIGatewayProxyResultV2 {
  const { result, successStatus, traceId } = params;
  if (result.success) {
    return apiSuccessResponse({
      statusCode: successStatus,
      message: successStatus === 201 ? "Created" : "OK",
      data: result.value,
    });
  }

  switch (result.failure.kind) {
    case "validation":
      return apiErrorResponse({
        statusCode: 400,
        message: "Validation failed",
        data: { errors: result.failure.fields },
        traceId,
      });
    case "event_not_found":
      return apiErrorResponse({
        statusCode: 404,
        message: "Event not found",
        data: null,
        traceId,
      });
    case "event_not_active":
      return apiErrorResponse({
        statusCode: 409,
        message: "Event is not active",
        data: null,
        traceId,
      });
    case "sold_out":
      return apiErrorResponse({
        statusCode: 409,
        message: "Not enough tickets available",
        data: null,
        traceId,
      });
    case "order_not_found":
      return apiErrorResponse({
        statusCode: 404,
        message: "Order not found",
        data: null,
        traceId,
      });
  }
}
