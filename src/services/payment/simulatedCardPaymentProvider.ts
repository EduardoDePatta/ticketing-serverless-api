import { randomUUID } from "node:crypto";
import type { PaymentChargeInput, PaymentOutcome, PaymentProvider, } from "./paymentProvider";
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
