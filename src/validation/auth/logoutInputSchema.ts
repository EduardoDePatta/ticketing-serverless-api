import { z } from "zod";

export const logoutInputSchema = z.strictObject({
    refreshToken: z.string().trim().min(1, "Refresh token is required"),
});
