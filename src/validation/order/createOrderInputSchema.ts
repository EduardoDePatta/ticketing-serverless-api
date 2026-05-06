import { z } from "zod";

export const createOrderInputSchema = z.strictObject({
    eventId: z.string().trim().min(1, "Event id is required"),
    quantity: z
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be at least 1"),
});
