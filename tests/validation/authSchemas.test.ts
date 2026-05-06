import {
    loginInputSchema,
    refreshInputSchema,
    registerInputSchema,
} from "../../src/validation/auth";

describe("registerInputSchema", () => {
    const validInput = {
        email: "user@example.com",
        password: "Sup3rL0ngPassword!",
        name: "Alice",
        role: "CUSTOMER",
    };

    it("accepts a fully valid input", () => {
        const r = registerInputSchema.safeParse(validInput);
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.email).toBe("user@example.com");
        }
    });

    it("lowercases the email", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            email: "USER@Example.COM",
        });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.email).toBe("user@example.com");
        }
    });

    it("rejects invalid email format", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            email: "not-an-email",
        });
        expect(r.success).toBe(false);
    });

    it("rejects passwords shorter than 12 characters", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            password: "abc12345",
        });
        expect(r.success).toBe(false);
    });

    it("rejects passwords longer than 128 characters", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            password: "a".repeat(129),
        });
        expect(r.success).toBe(false);
    });

    it("rejects unknown roles", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            role: "ADMIN",
        });
        expect(r.success).toBe(false);
    });

    it("rejects empty name", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            name: "  ",
        });
        expect(r.success).toBe(false);
    });

    it("trims the name", () => {
        const r = registerInputSchema.safeParse({
            ...validInput,
            name: "  Alice  ",
        });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.name).toBe("Alice");
        }
    });
});

describe("loginInputSchema", () => {
    it("requires email and password", () => {
        const r = loginInputSchema.safeParse({});
        expect(r.success).toBe(false);
    });

    it("lowercases email", () => {
        const r = loginInputSchema.safeParse({
            email: "USER@Example.COM",
            password: "anything",
        });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.email).toBe("user@example.com");
        }
    });

    it("rejects empty password", () => {
        const r = loginInputSchema.safeParse({
            email: "user@example.com",
            password: "",
        });
        expect(r.success).toBe(false);
    });
});

describe("refreshInputSchema", () => {
    it("requires refreshToken", () => {
        const r = refreshInputSchema.safeParse({});
        expect(r.success).toBe(false);
    });

    it("rejects empty refreshToken", () => {
        const r = refreshInputSchema.safeParse({ refreshToken: "  " });
        expect(r.success).toBe(false);
    });

    it("accepts a non-empty token string", () => {
        const r = refreshInputSchema.safeParse({
            refreshToken: "id.secret",
        });
        expect(r.success).toBe(true);
    });
});
