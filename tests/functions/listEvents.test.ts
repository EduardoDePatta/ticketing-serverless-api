import { handler } from "../../src/functions/listEvents";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
const mockList = jest.fn();
jest.mock("../../src/services/eventService", () => ({
    EventService: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        list: (...args: unknown[]) => mockList(...args),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    })),
}));
describe("listEvents handler", () => {
    beforeEach(() => {
        mockList.mockReset();
    });
    it("returns 200 with list data", async () => {
        mockList.mockResolvedValue({ success: true, value: [] });
        const event = buildHttpApiV2Event({
            routeKey: "GET /events",
            rawPath: "/events",
            requestContext: { http: { method: "GET", path: "/events" } },
        });
        const result = await invokeHttpHandler(handler, event);
        expect(result.statusCode).toBe(200);
        const body = parseLambdaJsonBody(result) as {
            message: string;
            data: unknown[];
        };
        expect(body.message).toBe("OK");
        expect(body.data).toEqual([]);
    });
});
