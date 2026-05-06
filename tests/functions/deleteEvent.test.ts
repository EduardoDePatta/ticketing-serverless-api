import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/deleteEvent";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockDelete = jest.fn();
jest.mock("../../src/services/eventService", () => ({
  EventService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
  })),
}));
function eventWithAuth(params: {
  id?: string;
  userId?: string;
  role?: string;
}): APIGatewayProxyEventV2 {
  const event = buildHttpApiV2Event({
    routeKey: "DELETE /events/{id}",
    rawPath: `/events/${params.id ?? "evt-1"}`,
    pathParameters: params.id !== undefined ? { id: params.id } : undefined,
    requestContext: {
      http: {
        method: "DELETE",
        path: `/events/${params.id ?? "evt-1"}`,
      },
    },
  });
  if (params.userId !== undefined || params.role !== undefined) {
    const requestContext = event.requestContext as unknown as {
      authorizer?: {
        lambda?: Record<string, unknown>;
      };
    };
    requestContext.authorizer = {
      lambda: { userId: params.userId, role: params.role },
    };
  }

  return event;
}

describe("deleteEvent handler", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });
  it("returns 401 when authorizer context is missing", async () => {
    const event = eventWithAuth({ id: "evt-1" });
    const result = await invokeHttpHandler(handler, event);
    expect(result.statusCode).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });
  it("returns 403 when caller is a CUSTOMER", async () => {
    const event = eventWithAuth({
      id: "evt-1",
      userId: "u-1",
      role: "CUSTOMER",
    });
    const result = await invokeHttpHandler(handler, event);
    expect(result.statusCode).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });
  it("returns 200 with null data when delete succeeds and forwards actorId", async () => {
    mockDelete.mockResolvedValue({ success: true, value: undefined });
    const event = eventWithAuth({
      id: "evt-1",
      userId: "u-org",
      role: "ORGANIZER",
    });
    const result = await invokeHttpHandler(handler, event);
    expect(result.statusCode).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({
      id: "evt-1",
      actorId: "u-org",
    });
    const body = parseLambdaJsonBody(result) as {
      message: string;
      data: unknown;
    };
    expect(body.message).toBe("Deleted");
    expect(body.data).toBeNull();
  });
});
