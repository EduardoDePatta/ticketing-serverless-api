import type { APIGatewayProxyResultV2 } from "aws-lambda";
export type ApiSuccessBody<T> = {
    status: number;
    message: string;
    data: T | null;
};
export type ApiErrorBody = {
    status: number;
    message: string;
    data: unknown;
    traceId: string;
};
export function apiSuccessResponse<T>(params: {
    statusCode: number;
    message: string;
    data: T | null;
}): APIGatewayProxyResultV2 {
    const { statusCode, message, data } = params;
    const body: ApiSuccessBody<T> = {
        status: statusCode,
        message,
        data,
    };
    return {
        statusCode,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    };
}
export function apiErrorResponse(params: {
    statusCode: number;
    message: string;
    data: unknown;
    traceId: string;
}): APIGatewayProxyResultV2 {
    const { statusCode, message, data, traceId } = params;
    const body: ApiErrorBody = {
        status: statusCode,
        message,
        data,
        traceId,
    };
    return {
        statusCode,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    };
}
