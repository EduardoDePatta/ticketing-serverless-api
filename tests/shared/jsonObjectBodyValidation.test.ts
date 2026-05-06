import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { JsonObjectBodyValidation } from "../../src/shared/http/jsonObjectBodyValidation";
import { parseLambdaJsonBody } from "../helpers/parseLambdaBody";

describe("JsonObjectBodyValidation", () => {
    const traceId = "trace-test-1";

    it("returns ok for valid JSON object", () => {
        const r = JsonObjectBodyValidation.parseOrBadRequest({
            rawBody: '{"x":1}',
            traceId,
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value).toEqual({ x: 1 });
        }
    });

    it("returns 400 envelope with traceId on invalid JSON", () => {
        const r = JsonObjectBodyValidation.parseOrBadRequest({
            rawBody: "oops",
            traceId,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(
                (r.response as APIGatewayProxyStructuredResultV2).statusCode
            ).toBe(400);
            const body = parseLambdaJsonBody(
                r.response as APIGatewayProxyStructuredResultV2
            ) as {
                status: number;
                message: string;
                data: unknown;
                traceId: string;
            };
            expect(body.status).toBe(400);
            expect(body.message).toBe("Invalid JSON body");
            expect(body.data).toBeNull();
            expect(body.traceId).toBe(traceId);
        }
    });

    it("returns 400 when root is array", () => {
        const r = JsonObjectBodyValidation.parseOrBadRequest({
            rawBody: "[]",
            traceId,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            const body = parseLambdaJsonBody(
                r.response as APIGatewayProxyStructuredResultV2
            ) as {
                message: string;
            };
            expect(body.message).toBe("JSON body must be an object");
        }
    });
});
