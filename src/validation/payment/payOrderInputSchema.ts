import { z } from "zod";
import { billingAddressSchema } from "./addressSchema";
import { cardSchema } from "./cardSchema";

export const payOrderInputSchema = z.strictObject({
  card: cardSchema,
  billingAddress: billingAddressSchema,
});
export type PayOrderInput = z.output<typeof payOrderInputSchema>;
