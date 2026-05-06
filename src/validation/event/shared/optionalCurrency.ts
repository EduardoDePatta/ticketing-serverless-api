import { z } from "zod";

export const optionalCurrency = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : v.trim()))
  .refine((v) => v === undefined || v.length > 0, "Currency cannot be empty when provided");
