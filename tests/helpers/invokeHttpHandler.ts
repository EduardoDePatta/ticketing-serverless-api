import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";

const emptyContext = {} as Context;
const noopCallback = (): void => {};

export async function invokeHttpHandler(
  handler: APIGatewayProxyHandlerV2,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const result = await handler(event, emptyContext, noopCallback);
  if (result === undefined || result === null) {
    throw new Error("Handler returned no result");
  }

  if (typeof result === "string") {
    throw new Error("Handler returned a string body (unexpected in tests)");
  }

  return result;
}
