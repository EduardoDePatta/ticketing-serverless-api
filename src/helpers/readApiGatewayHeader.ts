import type { APIGatewayProxyEventV2 } from "aws-lambda";

export function readApiGatewayHeader(params: {
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
