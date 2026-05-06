import { z } from "zod";

export const eventIdParamSchema = z
    .string()
    .trim()
    .min(1, "Id is required");
