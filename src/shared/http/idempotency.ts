import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { buildIdempotencyRequestHash } from "../../helpers/buildIdempotencyRequestHash";
import { readApiGatewayHeader } from "../../helpers/readApiGatewayHeader";
import { storedRequestMatches } from "../../helpers/storedRequestMatches";
import { IdempotencyRepository } from "../../repositories/idempotencyRepository";
import { apiErrorResponse } from "./apiResponse";

export { buildIdempotencyRequestHash } from "../../helpers/buildIdempotencyRequestHash";
export { legacyRawBodyRequestHash } from "../../helpers/legacyRawBodyRequestHash";

export interface RunWithIdempotencyParams {
  event: APIGatewayProxyEventV2;
  customerId: string;
  traceId: string;
  scope: string;
  repository: IdempotencyRepository;
  ttlSeconds: number;
  exec: () => Promise<APIGatewayProxyStructuredResultV2>;
  now?: () => Date;
  hashRequest?: (params: { method: string; path: string; body: string }) => string;
}
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export async function runWithIdempotency(
  params: RunWithIdempotencyParams
): Promise<APIGatewayProxyResultV2> {
  const {
    event,
    customerId,
    traceId,
    scope,
    repository,
    ttlSeconds = DEFAULT_TTL_SECONDS,
    exec,
    now = () => new Date(),
    hashRequest = buildIdempotencyRequestHash,
  } = params;
  const idempotencyKey = readApiGatewayHeader({ event, name: "Idempotency-Key" });
  if (!idempotencyKey) {
    return apiErrorResponse({
      statusCode: 400,
      message: "Idempotency-Key header is required",
      data: null,
      traceId,
    });
  }

  const pk = `${scope}#${customerId}#${idempotencyKey}`;
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path;
  const body = event.body ?? "";
  const requestHash = hashRequest({
    method,
    path,
    body,
  });
  const reserveResult = await repository.tryReserve({
    pk,
    requestHash,
    ttlSeconds,
    now: now(),
  });
  if (reserveResult.kind === "existing") {
    const existing = reserveResult.record;
    if (
      !storedRequestMatches({
        storedHash: existing.requestHash,
        method,
        path,
        body,
        primaryHash: requestHash,
      })
    ) {
      return apiErrorResponse({
        statusCode: 422,
        message: "Idempotency-Key was already used with a different request payload",
        data: null,
        traceId,
      });
    }

    if (existing.status === "in_progress") {
      return apiErrorResponse({
        statusCode: 409,
        message: "A concurrent request with the same Idempotency-Key is in progress",
        data: null,
        traceId,
      });
    }

    return {
      statusCode: existing.statusCode ?? 200,
      headers: { "content-type": "application/json" },
      body: existing.responseBody ?? "",
    };
  }

  const result = await exec();
  const statusCode = result.statusCode ?? 200;
  const responseBody = typeof result.body === "string" ? result.body : "";
  await repository.complete({
    pk,
    statusCode,
    responseBody,
  });
  return result;
}
