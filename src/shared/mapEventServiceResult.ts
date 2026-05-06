import type { APIGatewayProxyResultV2 } from "aws-lambda";
import type { EventServiceResult } from "../services/eventService";
import { apiErrorResponse, apiSuccessResponse } from "./http/apiResponse";

export function mapEventServiceResult<T>(params: {
  result: EventServiceResult<T>;
  successStatus: number;
  traceId: string;
}): APIGatewayProxyResultV2 {
  const { result, successStatus, traceId } = params;
  if (result.success) {
    const isDelete = result.value === undefined;
    const data = isDelete ? null : result.value;
    const message = isDelete ? "Deleted" : successStatus === 201 ? "Created" : "OK";
    return apiSuccessResponse({
      statusCode: successStatus,
      message,
      data,
    });
  }

  if (result.failure.kind === "validation") {
    return apiErrorResponse({
      statusCode: 400,
      message: "Validation failed",
      data: { errors: result.failure.fields },
      traceId,
    });
  }

  return apiErrorResponse({
    statusCode: 404,
    message: "Event not found",
    data: null,
    traceId,
  });
}
