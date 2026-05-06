import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(
    z
      .string()
      .trim()
      .max(0)
      .transform(() => undefined)
  );

export const billingAddressSchema = z.strictObject({
  line1: z
    .string()
    .trim()
    .min(2, "Address line 1 is required")
    .max(128, "Address line 1 is too long"),
  line2: optionalTrimmedString,
  city: z.string().trim().min(1, "City is required").max(64, "City is too long"),
  state: z.string().trim().min(1, "State/region is required").max(64, "State/region is too long"),
  postalCode: z
    .string()
    .trim()
    .min(3, "Postal code is required")
    .max(16, "Postal code is too long"),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/u, "Country must be an ISO 3166-1 alpha-2 code"),
});
export type BillingAddressInput = z.output<typeof billingAddressSchema>;
