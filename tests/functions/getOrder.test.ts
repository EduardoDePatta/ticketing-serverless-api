import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/getOrder";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockGetById = jest.fn();
jest.mock("../../src/services/orderService", () => ({
    OrderService: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        getById: (...args: unknown[]) => mockGetById(...args),
    })),
}));
function eventWithAuth(params: {
    id?: string;
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "GET /orders/{id}",
        rawPath: `/orders/${params.id ?? "ord-1"}`,
        pathParameters: params.id !== undefined ? { id: params.id } : undefined,
        requestContext: {
            http: { method: "GET", path: `/orders/${params.id ?? "ord-1"}` },
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
describe("getOrder handler", () => {
    beforeEach(() => {
        mockGetById.mockReset();
    });
    it("returns 401 when authorizer context is missing", async () => {
        const event = eventWithAuth({ id: "ord-1" });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockGetById).not.toHaveBeenCalled();
    });
    it("returns 403 when caller is an ORGANIZER", async () => {
        const event = eventWithAuth({
            id: "ord-1",
            userId: "u-1",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(403);
        expect(mockGetById).not.toHaveBeenCalled();
    });
    it("forwards customerId to service and returns 200 when owner matches", async () => {
        const order = {
            id: "ord-1",
            customerId: "u-cust",
            eventId: "evt-1",
            quantity: 2,
            status: "PENDING" as const,
            totalAmountInCents: 2000,
            currency: "USD",
            expiresAt: "2026-01-01T00:30:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        };
        mockGetById.mockResolvedValue({ success: true, value: order });
        const event = eventWithAuth({
            id: "ord-1",
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        expect(mockGetById).toHaveBeenCalledWith({
            id: "ord-1",
            customerId: "u-cust",
        });
        const body = parseLambdaJsonBody(result) as {
            data: typeof order;
        };
        expect(body.data?.id).toBe("ord-1");
    });
    it("returns 404 when service reports order_not_found", async () => {
        mockGetById.mockResolvedValue({
            success: false,
            failure: { kind: "order_not_found" },
        });
        const event = eventWithAuth({
            id: "ord-1",
            userId: "u-cust",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(404);
        const body = parseLambdaJsonBody(result) as {
            message: string;
        };
        expect(body.message).toBe("Order not found");
    });
});
