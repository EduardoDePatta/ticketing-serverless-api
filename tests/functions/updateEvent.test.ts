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

describe("updateEvent handler", () => {
    beforeEach(() => {
        mockUpdate.mockReset();
    });

    it("returns 200 when update succeeds", async () => {
        const updated = {
            id: "evt-1",
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

        const event = buildHttpApiV2Event({
            routeKey: "PUT /events/{id}",
            rawPath: "/events/evt-1",
            pathParameters: { id: "evt-1" },
            body: JSON.stringify({ name: "Updated" }),
            requestContext: { http: { method: "PUT", path: "/events/evt-1" } },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith({
            id: "evt-1",
            input: { name: "Updated" },
        });
        const body = parseLambdaJsonBody(result) as { data: typeof updated };
        expect(body.data?.name).toBe("Updated");
    });

    it("returns 400 for invalid JSON", async () => {
        const event = buildHttpApiV2Event({
            pathParameters: { id: "evt-1" },
            body: "not-json",
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
