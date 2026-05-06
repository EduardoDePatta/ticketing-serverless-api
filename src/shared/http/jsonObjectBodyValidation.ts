import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { apiErrorResponse } from "./apiResponse";
import { parseJsonBody } from "../parseJsonBody";
export type JsonObjectBodyParseResult = {
    ok: true;
    value: Record<string, unknown>;
} | {
    ok: false;
    response: APIGatewayProxyResultV2;
};
export class JsonObjectBodyValidation {
    static parseOrBadRequest(params: {
        rawBody: string | undefined | null;
        traceId: string;
    }): JsonObjectBodyParseResult {
        const parsed = parseJsonBody({ rawBody: params.rawBody });
        if (parsed.ok) {
            return { ok: true, value: parsed.value };
        }
        const message = JsonObjectBodyValidation.messageForFailureReason({
            reason: parsed.reason,
        });
        return {
            ok: false,
            response: apiErrorResponse({
                statusCode: 400,
                message,
                data: null,
                traceId: params.traceId,
            }),
        };
    }
    private static messageForFailureReason(params: {
        reason: "invalid_json" | "not_object";
    }): string {
        const { reason } = params;
        switch (reason) {
            case "invalid_json":
                return "Invalid JSON body";
            case "not_object":
                return "JSON body must be an object";
        }
    }
}
