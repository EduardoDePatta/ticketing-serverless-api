import { randomUUID } from "node:crypto";
import { Order, OrderStatus } from "../entities/order";
import { Payment } from "../entities/payment";
import { OrderRepository } from "../repositories/orderRepository";
import { PaymentRepository } from "../repositories/paymentRepository";
import { orderIdParamSchema } from "../validation/order";
import { PayOrderInput, payOrderInputSchema } from "../validation/payment/payOrderInputSchema";
import { zodErrorToFieldErrors } from "../validation/zodErrorToFieldErrors";
import { PaymentProvider } from "./payment/paymentProvider";
import { SimulatedCardPaymentProvider } from "./payment/simulatedCardPaymentProvider";

export type PaymentServiceFailure =
  | {
      kind: "validation";
      fields: Record<string, string>;
    }
  | {
      kind: "order_not_found";
    }
  | {
      kind: "invalid_state";
      currentStatus: OrderStatus;
    }
  | {
      kind: "expired";
    }
  | {
      kind: "charge_failed";
      outcome: "declined" | "error";
      reason?: string;
      payment: Payment;
    };
export interface PaidOrderResult {
  order: Order;
  payment: Payment;
}
export type PaymentServiceResult<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      failure: PaymentServiceFailure;
    };
export interface PaymentServiceParams {
  orderRepository?: OrderRepository;
  paymentRepository?: PaymentRepository;
  provider?: PaymentProvider;
  idGenerator?: () => string;
  now?: () => Date;
}
export class PaymentService {
  private readonly orderRepository: OrderRepository;
  private readonly paymentRepository: PaymentRepository;
  private readonly provider: PaymentProvider;
  private readonly idGenerator: () => string;
  private readonly now: () => Date;
  constructor(params: PaymentServiceParams = {}) {
    this.orderRepository = params.orderRepository ?? new OrderRepository();
    this.paymentRepository = params.paymentRepository ?? new PaymentRepository();
    this.provider = params.provider ?? new SimulatedCardPaymentProvider();
    this.idGenerator = params.idGenerator ?? randomUUID;
    this.now = params.now ?? (() => new Date());
  }
  async payOrder(params: {
    orderId: string;
    customerId: string;
    input: unknown;
  }): Promise<PaymentServiceResult<PaidOrderResult>> {
    const { orderId, customerId, input } = params;
    const idParsed = orderIdParamSchema.safeParse(orderId);
    if (!idParsed.success) {
      return {
        success: false,
        failure: {
          kind: "validation",
          fields: zodErrorToFieldErrors({ error: idParsed.error }),
        },
      };
    }

    const inputParsed = payOrderInputSchema.safeParse(input);
    if (!inputParsed.success) {
      return {
        success: false,
        failure: {
          kind: "validation",
          fields: zodErrorToFieldErrors({
            error: inputParsed.error,
          }),
        },
      };
    }

    const order = await this.orderRepository.findById(idParsed.data);
    if (!order || order.customerId !== customerId) {
      return { success: false, failure: { kind: "order_not_found" } };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        failure: {
          kind: "invalid_state",
          currentStatus: order.status,
        },
      };
    }

    const nowDate = this.now();
    if (new Date(order.expiresAt).getTime() <= nowDate.getTime()) {
      return { success: false, failure: { kind: "expired" } };
    }

    const payment = await this.chargeAndPersist({
      order,
      input: inputParsed.data,
      nowDate,
    });
    if (payment.status !== "succeeded") {
      return {
        success: false,
        failure: {
          kind: "charge_failed",
          outcome: payment.status,
          reason: payment.failureReason,
          payment,
        },
      };
    }

    const marked = await this.orderRepository.markPaid({
      id: order.id,
      paymentId: payment.id,
      now: nowDate,
    });
    if (!marked) {
      const refreshed = await this.orderRepository.findById(order.id);
      return {
        success: false,
        failure: {
          kind: "invalid_state",
          currentStatus: refreshed?.status ?? "EXPIRED",
        },
      };
    }

    const updatedOrder: Order = {
      ...order,
      status: "PAID",
      paymentId: payment.id,
      updatedAt: nowDate.toISOString(),
    };
    return {
      success: true,
      value: { order: updatedOrder, payment },
    };
  }
  private async chargeAndPersist(params: {
    order: Order;
    input: PayOrderInput;
    nowDate: Date;
  }): Promise<Payment> {
    const { order, input, nowDate } = params;
    const outcome = await this.provider.charge({
      card: input.card,
      billingAddress: input.billingAddress,
      amountInCents: order.totalAmountInCents,
      currency: order.currency,
    });
    const payment: Payment = {
      id: this.idGenerator(),
      orderId: order.id,
      customerId: order.customerId,
      provider: this.provider.name,
      providerPaymentId: outcome.providerPaymentId,
      amountInCents: order.totalAmountInCents,
      currency: order.currency,
      last4: outcome.last4,
      cardHolderName: input.card.holderName,
      billingCountry: input.billingAddress.country,
      status: outcome.kind,
      failureReason: outcome.reason,
      createdAt: nowDate.toISOString(),
    };
    return this.paymentRepository.create(payment);
  }
}
