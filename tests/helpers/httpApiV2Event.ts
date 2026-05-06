import type { APIGatewayEventRequestContextV2, APIGatewayProxyEventV2 } from "aws-lambda";

export type BuildHttpApiV2EventOptions = Partial<
  Omit<APIGatewayProxyEventV2, "requestContext" | "version">
> & {
  requestContext?: Partial<Omit<APIGatewayEventRequestContextV2, "http">> & {
    http?: Partial<APIGatewayEventRequestContextV2["http"]>;
  };
};
export function buildHttpApiV2Event(
  partial: BuildHttpApiV2EventOptions = {}
): APIGatewayProxyEventV2 {
  const rc = partial.requestContext ?? {};
  return {
    version: "2.0",
    routeKey: partial.routeKey ?? "GET /",
    rawPath: partial.rawPath ?? "/",
    rawQueryString: partial.rawQueryString ?? "",
    headers: partial.headers ?? {},
    isBase64Encoded: partial.isBase64Encoded ?? false,
    body: partial.body,
    pathParameters: partial.pathParameters,
    cookies: partial.cookies,
    queryStringParameters: partial.queryStringParameters,
    stageVariables: partial.stageVariables,
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api-id",
      domainName: "test.example.com",
      domainPrefix: "test",
      requestId: rc.requestId ?? "test-request-id",
      routeKey: partial.routeKey ?? "GET /",
      stage: "dev",
      time: "01/Jan/2024:00:00:00 +0000",
      timeEpoch: 1704067200000,
      ...rc,
      http: {
        method: "GET",
        path: "/",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
        ...rc.http,
      },
    },
  } as APIGatewayProxyEventV2;
}
