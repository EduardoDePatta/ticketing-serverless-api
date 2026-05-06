import { z } from "zod";

import { optionalCurrency, optionalTrimmedDescription } from "./shared";

export const updateEventInputSchema = z
    .strictObject({
        name: z.string().trim().min(1, "Name cannot be empty"),
        description: optionalTrimmedDescription,
        date: z.string().trim().min(1, "Date cannot be empty"),
        location: z.string().trim().min(1, "Location cannot be empty"),
        priceInCents: z
            .number()
            .int("Price must be an integer")
            .positive("Price must be a positive integer (cents)"),
        availableTickets: z
            .number()
            .int("Available tickets must be an integer")
            .nonnegative("Available tickets must be a non-negative integer"),
        currency: optionalCurrency,
        status: z.enum(["ACTIVE", "CANCELLED"]),
    })
    .partial();
