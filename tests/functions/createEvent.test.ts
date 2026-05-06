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

describe("createEvent handler", () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });

    it("returns 201 with data when service succeeds", async () => {
        const eventPayload = {
            name: "Show",
            date: "2026-06-15T20:00:00.000Z",
            location: "Lisboa",
            priceInCents: 1000,
            availableTickets: 10,
        };
        const created = {
            id: "evt-1",
            ...eventPayload,
            currency: "USD",
            status: "ACTIVE" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        };
        mockCreate.mockResolvedValue({ success: true, value: created });

        const event = buildHttpApiV2Event({
            routeKey: "POST /events",
            rawPath: "/events",
            body: JSON.stringify(eventPayload),
            requestContext: {
                http: { method: "POST", path: "/events" },
            },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(201);
        expect(mockCreate).toHaveBeenCalledTimes(1);
        const body = parseLambdaJsonBody(result) as {
            status: number;
            message: string;
            data: typeof created;
        };
        expect(body.message).toBe("Created");
        expect(body.data?.id).toBe("evt-1");
    });

    it("returns 400 without calling service when JSON is invalid", async () => {
        mockCreate.mockResolvedValue({ success: true, value: {} });

        const event = buildHttpApiV2Event({
            routeKey: "POST /events",
            body: "not-json",
            requestContext: { http: { method: "POST", path: "/events" } },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
        const body = parseLambdaJsonBody(result) as {
            traceId: string;
        };
        expect(body.traceId).toBe("test-request-id");
    });

    it("returns 400 with validation errors when service rejects", async () => {
        mockCreate.mockResolvedValue({
            success: false,
            failure: {
                kind: "validation",
                fields: { name: "Name is required" },
            },
        });

        const event = buildHttpApiV2Event({
            routeKey: "POST /events",
            body: JSON.stringify({}),
            requestContext: { http: { method: "POST", path: "/events" } },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(400);
        const body = parseLambdaJsonBody(result) as {
            data: { errors: Record<string, string> };
            traceId: string;
        };
        expect(body.data.errors.name).toBe("Name is required");
        expect(body.traceId).toBe("test-request-id");
    });
});
