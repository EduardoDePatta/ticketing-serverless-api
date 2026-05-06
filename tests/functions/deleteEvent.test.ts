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

describe("deleteEvent handler", () => {
    beforeEach(() => {
        mockDelete.mockReset();
    });

    it("returns 200 with null data when delete succeeds", async () => {
        mockDelete.mockResolvedValue({ success: true, value: undefined });

        const event = buildHttpApiV2Event({
            pathParameters: { id: "evt-1" },
            requestContext: { http: { method: "DELETE", path: "/events/evt-1" } },
        });

        const result = await invokeHttpHandler(handler, event);

        expect(result.statusCode).toBe(200);
        const body = parseLambdaJsonBody(result) as {
            message: string;
            data: unknown;
        };
        expect(body.message).toBe("Deleted");
        expect(body.data).toBeNull();
    });
});
