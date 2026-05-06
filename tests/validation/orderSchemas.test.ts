import {
    createOrderInputSchema,
    orderIdParamSchema,
} from "../../src/validation/order";

const valid = { eventId: "evt-1", quantity: 2 };

describe("createOrderInputSchema", () => {
    it("accepts a valid input", () => {
        const r = createOrderInputSchema.safeParse(valid);
        expect(r.success).toBe(true);
    });

    it("trims eventId", () => {
        const r = createOrderInputSchema.safeParse({
            ...valid,
            eventId: "  evt-1  ",
        });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.eventId).toBe("evt-1");
        }
    });

    it("rejects empty eventId", () => {
        const r = createOrderInputSchema.safeParse({ ...valid, eventId: "  " });
        expect(r.success).toBe(false);
    });

    it("rejects non-positive quantity", () => {
        const r = createOrderInputSchema.safeParse({ ...valid, quantity: 0 });
        expect(r.success).toBe(false);
    });

    it("rejects non-integer quantity", () => {
        const r = createOrderInputSchema.safeParse({ ...valid, quantity: 1.5 });
        expect(r.success).toBe(false);
    });

    it("rejects unknown fields (strict)", () => {
        const r = createOrderInputSchema.safeParse({ ...valid, extra: 1 });
        expect(r.success).toBe(false);
    });
});

describe("orderIdParamSchema", () => {
    it("accepts non-empty id", () => {
        expect(orderIdParamSchema.safeParse("ord-1").success).toBe(true);
    });

    it("rejects blank id", () => {
        expect(orderIdParamSchema.safeParse("   ").success).toBe(false);
    });
});
