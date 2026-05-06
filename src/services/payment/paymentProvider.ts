import type { BillingAddressInput, CardInput } from "../../validation/payment";

export interface PaymentChargeInput {
  card: CardInput;
  billingAddress: BillingAddressInput;
  amountInCents: number;
  currency: string;
}
export type PaymentOutcomeKind = "succeeded" | "declined" | "error";
export interface PaymentOutcome {
  kind: PaymentOutcomeKind;
  providerPaymentId: string;
  last4: string;
  reason?: string;
}
export interface PaymentProvider {
  readonly name: string;
  charge(input: PaymentChargeInput): Promise<PaymentOutcome>;
}
