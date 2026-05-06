import { randomUUID } from "node:crypto";

import type {
    PaymentChargeInput,
    PaymentOutcome,
    PaymentProvider,
} from "./paymentProvider";

/**
 * SimulatedCardPaymentProvider is NOT a real payment processor: no network calls,
 * no PCI data leaves the function. It exists to drive end-to-end tests of the
 * order/payment flow without a live processor.
 *
 * Behavior:
 *   - Default for any Luhn-valid card: `succeeded`.
 *   - Magic numbers (Stripe-test-style):
 *       4000 0000 0000 0002 -> `declined` (insufficient_funds)
 *       4000 0000 0000 0119 -> `error`    (processing_error)
 */
const MAGIC_DECLINED = "4000000000000002";
const MAGIC_ERROR = "4000000000000119";

export interface SimulatedCardPaymentProviderParams {
    idGenerator?: () => string;
}

export class SimulatedCardPaymentProvider implements PaymentProvider {
    readonly name = "simulator-card";
    private readonly idGenerator: () => string;

    constructor(params: SimulatedCardPaymentProviderParams = {}) {
        this.idGenerator = params.idGenerator ?? randomUUID;
    }

    async charge(input: PaymentChargeInput): Promise<PaymentOutcome> {
        const last4 = input.card.number.slice(-4);
        const providerPaymentId = `sim_${this.idGenerator()}`;

        if (input.card.number === MAGIC_DECLINED) {
            return {
                kind: "declined",
                providerPaymentId,
                last4,
                reason: "card_declined",
            };
        }
        if (input.card.number === MAGIC_ERROR) {
            return {
                kind: "error",
                providerPaymentId,
                last4,
                reason: "processing_error",
            };
        }

        return {
            kind: "succeeded",
            providerPaymentId,
            last4,
        };
    }
}
