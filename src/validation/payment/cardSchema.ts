import { z } from "zod";
import { isLuhnValid, normalizeCardNumber } from "./luhn";
const monthSchema = z
    .number()
    .int("Expiry month must be an integer")
    .min(1, "Expiry month must be between 1 and 12")
    .max(12, "Expiry month must be between 1 and 12");
const yearSchema = z
    .number()
    .int("Expiry year must be an integer")
    .min(2000, "Expiry year is invalid")
    .max(2100, "Expiry year is invalid");
export const cardSchema = z
    .strictObject({
    number: z
        .string()
        .trim()
        .transform((raw) => normalizeCardNumber(raw))
        .pipe(z
        .string()
        .regex(/^\d+$/u, "Card number must contain only digits")
        .min(13, "Card number must be 13-19 digits")
        .max(19, "Card number must be 13-19 digits")
        .refine(isLuhnValid, {
        message: "Card number failed Luhn check",
    })),
    holderName: z
        .string()
        .trim()
        .min(2, "Cardholder name is required")
        .max(64, "Cardholder name is too long"),
    expiryMonth: monthSchema,
    expiryYear: yearSchema,
    cvv: z
        .string()
        .trim()
        .regex(/^\d{3,4}$/u, "CVV must be 3 or 4 digits"),
})
    .superRefine((value, ctx) => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    if (value.expiryYear < currentYear ||
        (value.expiryYear === currentYear &&
            value.expiryMonth < currentMonth)) {
        ctx.addIssue({
            code: "custom",
            path: ["expiryMonth"],
            message: "Card has expired",
        });
    }
});
export type CardInput = z.output<typeof cardSchema>;
