import { SimulatedCardPaymentProvider } from "../../../src/services/payment/simulatedCardPaymentProvider";
const baseInput = {
    billingAddress: {
        line1: "Rua A 1",
        city: "Lisboa",
        state: "Lisboa",
        postalCode: "1100-000",
        country: "PT",
    },
    amountInCents: 1000,
    currency: "EUR",
};
function chargeInput(cardNumber: string) {
    return {
        ...baseInput,
        card: {
            number: cardNumber,
            holderName: "Alice",
            expiryMonth: 12,
            expiryYear: 2030,
            cvv: "123",
        },
    };
}
describe("SimulatedCardPaymentProvider", () => {
    it("identifies itself", () => {
        expect(new SimulatedCardPaymentProvider().name).toBe("simulator-card");
    });
    it("returns succeeded for a normal card with last4 and a generated id", async () => {
        const provider = new SimulatedCardPaymentProvider({
            idGenerator: () => "sim-id-1",
        });
        const out = await provider.charge(chargeInput("4242424242424242"));
        expect(out.kind).toBe("succeeded");
        expect(out.last4).toBe("4242");
        expect(out.providerPaymentId).toBe("sim_sim-id-1");
    });
    it("returns declined for the magic 4000 0000 0000 0002 number", async () => {
        const provider = new SimulatedCardPaymentProvider();
        const out = await provider.charge(chargeInput("4000000000000002"));
        expect(out.kind).toBe("declined");
        expect(out.last4).toBe("0002");
        expect(out.reason).toMatch(/declin/i);
    });
    it("returns error for the magic 4000 0000 0000 0119 number", async () => {
        const provider = new SimulatedCardPaymentProvider();
        const out = await provider.charge(chargeInput("4000000000000119"));
        expect(out.kind).toBe("error");
        expect(out.last4).toBe("0119");
    });
});
