import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/updateEvent";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockUpdate = jest.fn();
jest.mock("../../src/services/eventService", () => ({
    EventService: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        list: jest.fn(),
        getById: jest.fn(),
        update: (...args: unknown[]) => mockUpdate(...args),
        delete: jest.fn(),
    })),
}));
function eventWithAuth(params: {
    id?: string;
    body?: string;
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "PUT /events/{id}",
        rawPath: `/events/${params.id ?? "evt-1"}`,
        pathParameters: params.id !== undefined ? { id: params.id } : undefined,
        body: params.body,
        requestContext: {
            http: { method: "PUT", path: `/events/${params.id ?? "evt-1"}` },
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
describe("updateEvent handler", () => {
    beforeEach(() => {
        mockUpdate.mockReset();
    });
    it("returns 401 when authorizer context is missing", async () => {
        const event = eventWithAuth({
            id: "evt-1",
            body: JSON.stringify({ name: "X" }),
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
    it("returns 403 when caller is a CUSTOMER", async () => {
        const event = eventWithAuth({
            id: "evt-1",
            body: JSON.stringify({ name: "X" }),
            userId: "u-1",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(403);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
    it("returns 200 and forwards actorId when update succeeds", async () => {
        const updated = {
            id: "evt-1",
            organizerId: "u-org",
            name: "Updated",
            date: "2026-01-01",
            location: "X",
            priceInCents: 100,
            currency: "USD",
            availableTickets: 5,
            status: "ACTIVE" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
        };
        mockUpdate.mockResolvedValue({ success: true, value: updated });
        const event = eventWithAuth({
            id: "evt-1",
            body: JSON.stringify({ name: "Updated" }),
            userId: "u-org",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith({
            id: "evt-1",
            input: { name: "Updated" },
            actorId: "u-org",
        });
        const body = parseLambdaJsonBody(result) as {
            data: typeof updated;
        };
        expect(body.data?.name).toBe("Updated");
    });
    it("returns 400 for invalid JSON", async () => {
        const event = eventWithAuth({
            id: "evt-1",
            body: "not-json",
            userId: "u-org",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
