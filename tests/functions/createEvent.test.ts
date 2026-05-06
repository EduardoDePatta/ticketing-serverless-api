import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/functions/createEvent";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockCreate = jest.fn();
jest.mock("../../src/services/eventService", () => ({
    EventService: jest.fn().mockImplementation(() => ({
        create: (...args: unknown[]) => mockCreate(...args),
        list: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    })),
}));
function eventWithAuth(params: {
    body?: string;
    userId?: string;
    role?: string;
}): APIGatewayProxyEventV2 {
    const event = buildHttpApiV2Event({
        routeKey: "POST /events",
        rawPath: "/events",
        body: params.body,
        requestContext: { http: { method: "POST", path: "/events" } },
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
describe("createEvent handler", () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });
    it("returns 401 when authorizer context is missing", async () => {
        const event = eventWithAuth({
            body: JSON.stringify({
                name: "Show",
                date: "2026-06-15T20:00:00.000Z",
                location: "Lisboa",
                priceInCents: 1000,
                availableTickets: 10,
            }),
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(401);
        expect(mockCreate).not.toHaveBeenCalled();
    });
    it("returns 403 when caller is a CUSTOMER", async () => {
        const event = eventWithAuth({
            body: JSON.stringify({
                name: "Show",
                date: "2026-06-15T20:00:00.000Z",
                location: "Lisboa",
                priceInCents: 1000,
                availableTickets: 10,
            }),
            userId: "u-1",
            role: "CUSTOMER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
    });
    it("returns 201 with data when service succeeds and forwards organizerId", async () => {
        const eventPayload = {
            name: "Show",
            date: "2026-06-15T20:00:00.000Z",
            location: "Lisboa",
            priceInCents: 1000,
            availableTickets: 10,
        };
        const created = {
            id: "evt-1",
            organizerId: "u-org",
            ...eventPayload,
            currency: "USD",
            status: "ACTIVE" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        };
        mockCreate.mockResolvedValue({ success: true, value: created });
        const event = eventWithAuth({
            body: JSON.stringify(eventPayload),
            userId: "u-org",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(201);
        expect(mockCreate).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            input: eventPayload,
            organizerId: "u-org",
        });
        const body = parseLambdaJsonBody(result) as {
            status: number;
            message: string;
            data: typeof created;
        };
        expect(body.message).toBe("Created");
        expect(body.data?.id).toBe("evt-1");
    });
    it("returns 400 without calling service when JSON is invalid", async () => {
        const event = eventWithAuth({
            body: "not-json",
            userId: "u-org",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });
    it("returns 400 with validation errors when service rejects", async () => {
        mockCreate.mockResolvedValue({
            success: false,
            failure: {
                kind: "validation",
                fields: { name: "Name is required" },
            },
        });
        const event = eventWithAuth({
            body: JSON.stringify({}),
            userId: "u-org",
            role: "ORGANIZER",
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(400);
        const body = parseLambdaJsonBody(result) as {
            data: {
                errors: Record<string, string>;
            };
        };
        expect(body.data.errors.name).toBe("Name is required");
    });
});
