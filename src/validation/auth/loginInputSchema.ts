import { z } from "zod";

export const loginInputSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Email must be a valid email address"),
    password: z.string().min(1, "Password is required"),
});
