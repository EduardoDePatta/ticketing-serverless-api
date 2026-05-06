import { z } from "zod";
import { zodErrorToFieldErrors } from "../../src/validation/zodErrorToFieldErrors";
describe("zodErrorToFieldErrors", () => {
    it("maps first issue per path to a field key", () => {
        const schema = z.strictObject({
            a: z.string().min(1),
            b: z.number(),
        });
        const parsed = schema.safeParse({});
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            const fields = zodErrorToFieldErrors({ error: parsed.error });
            expect(fields.a).toBeDefined();
            expect(fields.b).toBeDefined();
        }
    });
    it("uses _root when path is empty", () => {
        const schema = z.string().min(1);
        const parsed = schema.safeParse("");
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            const fields = zodErrorToFieldErrors({ error: parsed.error });
            expect(fields._root).toBeDefined();
        }
    });
});
