import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/payOrder";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockPayOrder = jest.fn();
const mockTryReserve = jest.fn();
const mockComplete = jest.fn();
jest.mock("../../src/services/paymentService", () => ({
    PaymentService: jest.fn().mockImplementation(() => ({
        payOrder: (...args: unknown[]) => mockPayOrder(...args),
    })),
}));
jest.mock("../../src/repositories/idempotencyRepository", () => ({
    IdempotencyRepository: jest.fn().mockImplementation(() => ({
        tryReserve: (...args: unknown[]) => mockTryReserve(...args),
        complete: (...args: unknown[]) => mockComplete(...args),
    })),
}));
const validBody = {
    card: {
        number: "4242 4242 4242 4242",
        holderName: "Alice",
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: "123",
    },
    billingAddress: {
        line1: "Rua A 1",
        city: "Lisboa",
        state: "Lisboa",
        postalCode: "1100-000",
        country: "PT",
    },
};
function eventWithAuth(params: {
    id?: string;
    body?: unknown;
    headers?: Record<string, string>;
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "POST /orders/{id}/pay",
        rawPath: `/orders/${params.id ?? "ord-1"}/pay`,
        pathParameters: params.id !== undefined ? { id: params.id } : undefined,
        body: params.body === undefined
            ? undefined
            : typeof params.body === "string"
                ? params.body
                : JSON.stringify(params.body),
        headers: params.headers ?? {},
        requestContext: {
            http: {
                method: "POST",
                path: `/orders/${params.id ?? "ord-1"}/pay`,
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
describe("payOrder handler", () => {
    beforeEach(() => {
        mockPayOrder.mockReset();
        mockTryReserve.mockReset();
        mockComplete.mockReset();
    });
    it("returns 401 without authorizer context", async () => {
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            headers: { "idempotency-key": "k-1" },
        }));
        expect(result.statusCode).toBe(401);
        expect(mockPayOrder).not.toHaveBeenCalled();
    });
    it("returns 403 when caller is ORGANIZER", async () => {
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            headers: { "idempotency-key": "k-1" },
            userId: "u-1",
            role: "ORGANIZER",
        }));
        expect(result.statusCode).toBe(403);
        expect(mockPayOrder).not.toHaveBeenCalled();
    });
    it("returns 400 when Idempotency-Key header is missing", async () => {
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            userId: "u-cust",
            role: "CUSTOMER",
        }));
        expect(result.statusCode).toBe(400);
        expect(mockPayOrder).not.toHaveBeenCalled();
        const body = parseLambdaJsonBody(result) as {
            message: string;
        };
        expect(body.message).toContain("Idempotency-Key");
    });
    it("returns 400 when body is invalid JSON", async () => {
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: "not-json",
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        }));
        expect(result.statusCode).toBe(400);
        expect(mockPayOrder).not.toHaveBeenCalled();
    });
    it("forwards customerId and order id to the service and returns 200 on success", async () => {
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        mockComplete.mockResolvedValue(undefined);
        mockPayOrder.mockResolvedValue({
            success: true,
            value: {
                order: {
                    id: "ord-1",
                    status: "PAID",
                    paymentId: "pay-1",
                },
                payment: {
                    id: "pay-1",
                    last4: "4242",
                    status: "succeeded",
                },
            },
        });
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        }));
        expect(result.statusCode).toBe(200);
        expect(mockPayOrder).toHaveBeenCalledTimes(1);
        const args = mockPayOrder.mock.calls[0][0];
        expect(args.orderId).toBe("ord-1");
        expect(args.customerId).toBe("u-cust");
        expect(args.input).toEqual(validBody);
        expect(mockComplete).toHaveBeenCalledTimes(1);
    });
    it("returns 402 when charge fails (declined)", async () => {
        mockTryReserve.mockResolvedValue({ kind: "reserved" });
        mockPayOrder.mockResolvedValue({
            success: false,
            failure: {
                kind: "charge_failed",
                outcome: "declined",
                reason: "card_declined",
                payment: { id: "pay-1", last4: "0002" },
            },
        });
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        }));
        expect(result.statusCode).toBe(402);
    });
    it("replays cached response without calling the service when idempotency record exists", async () => {
        mockTryReserve.mockResolvedValue({
            kind: "existing",
            record: {
                pk: "any",
                status: "completed",
                requestHash: "*",
                statusCode: 200,
                responseBody: JSON.stringify({ replay: true }),
                createdAt: "x",
                expiresAtEpoch: 0,
            },
        });
        const result = await invokeHttpHandler(handler, eventWithAuth({
            id: "ord-1",
            body: validBody,
            headers: { "idempotency-key": "k-1" },
            userId: "u-cust",
            role: "CUSTOMER",
        }));
        expect(result.statusCode).toBe(422);
        expect(mockPayOrder).not.toHaveBeenCalled();
    });
});
