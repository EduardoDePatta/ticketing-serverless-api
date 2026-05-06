import { z } from "zod";
import { optionalCurrency, optionalTrimmedDescription } from "./shared";

export const createEventInputSchema = z.strictObject({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalTrimmedDescription,
  date: z.string().trim().min(1, "Date is required"),
  location: z.string().trim().min(1, "Location is required"),
  priceInCents: z
    .number()
    .int("Price must be an integer")
    .positive("Price must be a positive integer (cents)"),
  availableTickets: z
    .number()
    .int("Available tickets must be an integer")
    .nonnegative("Available tickets must be a non-negative integer"),
  currency: optionalCurrency,
});
