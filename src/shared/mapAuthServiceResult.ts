import type { APIGatewayProxyResultV2 } from "aws-lambda";
import type { AuthServiceResult } from "../services/authService";
import { apiErrorResponse, apiSuccessResponse } from "./http/apiResponse";
export type AuthSuccessSemantics = "created" | "ok" | "no_content";
export function mapAuthServiceResult<T>(params: {
    result: AuthServiceResult<T>;
    success: AuthSuccessSemantics;
    traceId: string;
}): APIGatewayProxyResultV2 {
    const { result, success, traceId } = params;
    if (result.success) {
        if (success === "no_content") {
            return apiSuccessResponse({
                statusCode: 204,
                message: "No Content",
                data: null,
            });
        }
        const statusCode = success === "created" ? 201 : 200;
        const message = success === "created" ? "Created" : "OK";
        return apiSuccessResponse({
            statusCode,
            message,
            data: result.value as T,
        });
    }
    const failure = result.failure;
    switch (failure.kind) {
        case "validation":
            return apiErrorResponse({
                statusCode: 400,
                message: "Validation failed",
                data: { errors: failure.fields },
                traceId,
            });
        case "email_taken":
            return apiErrorResponse({
                statusCode: 409,
                message: "Email already registered",
                data: null,
                traceId,
            });
        case "invalid_credentials":
            return apiErrorResponse({
                statusCode: 401,
                message: "Invalid credentials",
                data: null,
                traceId,
            });
        case "invalid_refresh_token":
            return apiErrorResponse({
                statusCode: 401,
                message: "Invalid refresh token",
                data: null,
                traceId,
            });
        case "reuse_detected":
            return apiErrorResponse({
                statusCode: 401,
                message: "Refresh token reuse detected",
                data: null,
                traceId,
            });
        case "user_not_found":
            return apiErrorResponse({
                statusCode: 404,
                message: "User not found",
                data: null,
                traceId,
            });
    }
}
