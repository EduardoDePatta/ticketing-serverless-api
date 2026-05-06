import { handler } from "../../src/functions/health";
import { buildHttpApiV2Event } from "../helpers/httpApiV2Event";
import { invokeHttpHandler } from "../helpers/invokeHttpHandler";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";
describe("health handler", () => {
    it("returns 200 success envelope", async () => {
        const result = await invokeHttpHandler(handler, buildHttpApiV2Event());
        expect(result.statusCode).toBe(200);
        const body = parseLambdaJsonBody(result) as {
            status: number;
            message: string;
            data: {
                service: string;
                timestamp: string;
            };
        };
        expect(body.status).toBe(200);
        expect(body.message).toBe("OK");
        expect(body.data.service).toBe("ticketing-api");
        expect(typeof body.data.timestamp).toBe("string");
    });
});
