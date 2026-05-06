import { createHash } from "node:crypto";

import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { IdempotencyRepository } from "../../repositories/idempotencyRepository";
import { apiErrorResponse } from "./apiResponse";

export interface RunWithIdempotencyParams {
    event: APIGatewayProxyEventV2;
    customerId: string;
    traceId: string;
    scope: string;
    repository: IdempotencyRepository;
    ttlSeconds: number;
    exec: () => Promise<APIGatewayProxyStructuredResultV2>;
    now?: () => Date;
    hashRequest?: (params: {
        method: string;
        path: string;
        body: string;
    }) => string;
}

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/**
 * Deterministic JSON text for hashing (sorted object keys). Ignores cosmetic
 * differences in serialization (whitespace, key order) that clients often vary
 * between retries.
 */
function stableStringify(value: unknown): string {
    if (value === null) {
        return "null";
    }
    const t = typeof value;
    if (t === "string") {
        return JSON.stringify(value as string);
    }
    if (t === "number" || t === "boolean") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => stableStringify(v)).join(",")}]`;
    }
    if (t === "object") {
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        return `{${keys
            .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

function canonicalBodyForHash(body: string): string {
    const trimmed = body.trim();
    if (trimmed === "") {
        return "";
    }
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === "object") {
            return stableStringify(parsed);
        }
        return JSON.stringify(
            parsed as string | number | boolean | null
        );
    } catch {
        return body;
    }
}

/**
 * Legacy request fingerprint (raw body bytes). Kept for comparison so existing
 * DynamoDB rows written before canonical hashing still match replays with the
 * exact same HTTP body.
 */
export function legacyRawBodyRequestHash(params: {
    method: string;
    path: string;
    body: string;
}): string {
    const { method, path, body } = params;
    return createHash("sha256")
        .update(`${method}\n${path}\n${body}`)
        .digest("hex");
}

export function buildIdempotencyRequestHash(params: {
    method: string;
    path: string;
    body: string;
}): string {
    const { method, path, body } = params;
    const canonicalBody = canonicalBodyForHash(body);
    return createHash("sha256")
        .update(`${method}\n${path}\n${canonicalBody}`)
        .digest("hex");
}

function storedRequestMatches(params: {
    storedHash: string;
    method: string;
    path: string;
    body: string;
    primaryHash: string;
}): boolean {
    const { storedHash, method, path, body, primaryHash } = params;
    if (storedHash === primaryHash) {
        return true;
    }
    const legacyHash = legacyRawBodyRequestHash({ method, path, body });
    return storedHash === legacyHash;
}

function readHeader(params: {
    event: APIGatewayProxyEventV2;
    name: string;
}): string | undefined {
    const { event, name } = params;
    const headers = event.headers ?? {};
    const lowered = name.toLowerCase();
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lowered) {
            const value = headers[key];
            if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
            }
        }
    }
    return undefined;
}

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

    const idempotencyKey = readHeader({ event, name: "Idempotency-Key" });
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
                message:
                    "Idempotency-Key was already used with a different request payload",
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
