import type { Order } from "../../src/entities/order";
import type { OrderRepository } from "../../src/repositories/orderRepository";
import type { PaymentRepository } from "../../src/repositories/paymentRepository";
import type {
  PaymentChargeInput,
  PaymentOutcome,
  PaymentProvider,
} from "../../src/services/payment/paymentProvider";
import { PaymentService } from "../../src/services/paymentService";

describe("PaymentService", () => {
  const orderFindById = jest.fn();
  const orderMarkPaid = jest.fn();
  const paymentCreate = jest.fn();
  const providerCharge = jest.fn();
  const idGenerator = jest.fn();
  const now = jest.fn();
  const orderRepository = {
    findById: orderFindById,
    markPaid: orderMarkPaid,
  } as unknown as OrderRepository;
  const paymentRepository = {
    create: paymentCreate,
  } as unknown as PaymentRepository;
  const provider: PaymentProvider = {
    name: "simulator-card",
    charge: (input: PaymentChargeInput) => providerCharge(input) as Promise<PaymentOutcome>,
  };
  function makeService(): PaymentService {
    return new PaymentService({
      orderRepository,
      paymentRepository,
      provider,
      idGenerator,
      now,
    });
  }

  function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: "ord-1",
      customerId: "u-cust",
      eventId: "evt-1",
      quantity: 2,
      status: "PENDING",
      totalAmountInCents: 2000,
      currency: "USD",
      expiresAt: "2030-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  function validInput() {
    return {
      card: {
        number: "4242 4242 4242 4242",
        holderName: "Alice",
        expiryMonth: 12,
        expiryYear: 2030,
        cvv: "123",
      },
      billingAddress: {
        line1: "Rua A 1",
        city: "Lisboa",
        state: "Lisboa",
        postalCode: "1100-000",
        country: "PT",
      },
    };
  }

  beforeEach(() => {
    orderFindById.mockReset();
    orderMarkPaid.mockReset();
    paymentCreate.mockReset();
    providerCharge.mockReset();
    idGenerator.mockReset();
    idGenerator.mockReturnValue("pay-1");
    now.mockReset();
    now.mockReturnValue(new Date("2026-01-01T00:00:00.000Z"));
  });
  it("returns validation when input is bad", async () => {
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: {},
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.failure.kind).toBe("validation");
    expect(orderFindById).not.toHaveBeenCalled();
    expect(providerCharge).not.toHaveBeenCalled();
  });
  it("returns order_not_found when order is missing", async () => {
    orderFindById.mockResolvedValue(null);
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.failure.kind).toBe("order_not_found");
    expect(providerCharge).not.toHaveBeenCalled();
  });
  it("returns order_not_found when caller does not own the order", async () => {
    orderFindById.mockResolvedValue(makeOrder({ customerId: "someone" }));
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.failure.kind).toBe("order_not_found");
  });
  it("returns invalid_state when order is not PENDING", async () => {
    orderFindById.mockResolvedValue(makeOrder({ status: "PAID" }));
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.failure.kind).toBe("invalid_state");
      if (r.failure.kind === "invalid_state") {
        expect(r.failure.currentStatus).toBe("PAID");
      }
    }
  });
  it("returns expired when expiresAt is in the past", async () => {
    orderFindById.mockResolvedValue(makeOrder({ expiresAt: "2020-01-01T00:00:00.000Z" }));
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.failure.kind).toBe("expired");
  });
  it("persists a declined payment, returns charge_failed and does not mark the order as paid", async () => {
    orderFindById.mockResolvedValue(makeOrder());
    providerCharge.mockResolvedValue({
      kind: "declined",
      providerPaymentId: "sim_x",
      last4: "0002",
      reason: "card_declined",
    });
    paymentCreate.mockImplementation(async (p) => p);
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.failure.kind).toBe("charge_failed");
      if (r.failure.kind === "charge_failed") {
        expect(r.failure.outcome).toBe("declined");
        expect(r.failure.reason).toBe("card_declined");
      }
    }

    expect(paymentCreate).toHaveBeenCalledTimes(1);
    const persistedPayment = paymentCreate.mock.calls[0][0];
    expect(persistedPayment.status).toBe("declined");
    expect(persistedPayment.last4).toBe("0002");
    expect(orderMarkPaid).not.toHaveBeenCalled();
  });
  it("on success persists payment, marks order paid and returns the updated order with payment", async () => {
    const order = makeOrder();
    orderFindById.mockResolvedValue(order);
    providerCharge.mockResolvedValue({
      kind: "succeeded",
      providerPaymentId: "sim_ok",
      last4: "4242",
    });
    paymentCreate.mockImplementation(async (p) => p);
    orderMarkPaid.mockResolvedValue(true);
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.value.order.status).toBe("PAID");
      expect(r.value.order.paymentId).toBe("pay-1");
      expect(r.value.payment.id).toBe("pay-1");
      expect(r.value.payment.last4).toBe("4242");
      expect(r.value.payment.status).toBe("succeeded");
    }

    expect(orderMarkPaid).toHaveBeenCalledWith({
      id: "ord-1",
      paymentId: "pay-1",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
  });
  it("rolls back to invalid_state when markPaid loses the race against the cleanup", async () => {
    orderFindById.mockResolvedValue(makeOrder());
    providerCharge.mockResolvedValue({
      kind: "succeeded",
      providerPaymentId: "sim_ok",
      last4: "4242",
    });
    paymentCreate.mockImplementation(async (p) => p);
    orderMarkPaid.mockResolvedValue(false);
    const r = await makeService().payOrder({
      orderId: "ord-1",
      customerId: "u-cust",
      input: validInput(),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.failure.kind).toBe("invalid_state");
  });
});
