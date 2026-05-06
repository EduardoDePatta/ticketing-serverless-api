import { z } from "zod";
import { ROLES } from "../../entities/user";
export const registerInputSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Email must be a valid email address"),
    password: z
        .string()
        .min(12, "Password must be at least 12 characters")
        .max(128, "Password must be at most 128 characters"),
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
    role: z.enum(ROLES, {
        message: "Role must be ORGANIZER or CUSTOMER",
    }),
});
