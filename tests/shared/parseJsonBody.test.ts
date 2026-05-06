import { parseJsonBody } from "../../src/shared/parseJsonBody";

describe("parseJsonBody", () => {
    it("returns empty object for undefined body", () => {
        const r = parseJsonBody({ rawBody: undefined });
        expect(r).toEqual({ ok: true, value: {} });
    });

    it("returns empty object for null body", () => {
        const r = parseJsonBody({ rawBody: null });
        expect(r).toEqual({ ok: true, value: {} });
    });

    it("returns empty object for empty string", () => {
        const r = parseJsonBody({ rawBody: "" });
        expect(r).toEqual({ ok: true, value: {} });
    });

    it("parses valid JSON object", () => {
        const r = parseJsonBody({ rawBody: '{"a":1}' });
        expect(r).toEqual({ ok: true, value: { a: 1 } });
    });

    it("fails on invalid JSON", () => {
        const r = parseJsonBody({ rawBody: "not-json" });
        expect(r).toEqual({ ok: false, reason: "invalid_json" });
    });

    it("fails on JSON array root", () => {
        const r = parseJsonBody({ rawBody: "[1,2]" });
        expect(r).toEqual({ ok: false, reason: "not_object" });
    });

    it("fails on JSON null root", () => {
        const r = parseJsonBody({ rawBody: "null" });
        expect(r).toEqual({ ok: false, reason: "not_object" });
    });
});
