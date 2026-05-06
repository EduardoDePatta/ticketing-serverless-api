import { handler } from "../../src/functions/getEvent";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

const mockGetById = jest.fn();

jest.mock("../../src/services/eventService", () => ({
    EventService: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        list: jest.fn(),
        getById: (...args: unknown[]) => mockGetById(...args),
        update: jest.fn(),
        delete: jest.fn(),
    })),
}));

describe("getEvent handler", () => {
    beforeEach(() => {
        mockGetById.mockReset();
    });

    it("returns 200 when event exists", async () => {
        const evt = {
            id: "evt-1",
            name: "Show",
            date: "2026-01-01",
            location: "X",
            priceInCents: 100,
            currency: "USD",
            availableTickets: 5,
            status: "ACTIVE" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        };
        mockGetById.mockResolvedValue({ success: true, value: evt });

        const event = buildHttpApiV2Event({
            routeKey: "GET /events/{id}",
            rawPath: "/events/evt-1",
            pathParameters: { id: "evt-1" },
            requestContext: { http: { method: "GET", path: "/events/evt-1" } },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(200);
        expect(mockGetById).toHaveBeenCalledWith({ id: "evt-1" });
        const body = parseLambdaJsonBody(result) as { data: typeof evt };
        expect(body.data?.id).toBe("evt-1");
    });

    it("returns 404 when not found", async () => {
        mockGetById.mockResolvedValue({
            success: false,
            failure: { kind: "not_found" },
        });

        const event = buildHttpApiV2Event({
            pathParameters: { id: "missing" },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(404);
        const body = parseLambdaJsonBody(result) as {
            message: string;
            traceId: string;
        };
        expect(body.message).toBe("Event not found");
        expect(body.traceId).toBeDefined();
    });
});
