import { z } from "zod";

export const orderIdParamSchema = z.string().trim().min(1, "Id is required");
