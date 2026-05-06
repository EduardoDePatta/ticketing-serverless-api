import { randomUUID } from "node:crypto";
import { Order } from "../entities/order";
import { EventRepository } from "../repositories/eventRepository";
import { OrderRepository } from "../repositories/orderRepository";
import { createOrderInputSchema, orderIdParamSchema, } from "../validation/order";
import { zodErrorToFieldErrors } from "../validation/zodErrorToFieldErrors";
export type OrderServiceFailure = {
    kind: "validation";
    fields: Record<string, string>;
} | {
    kind: "event_not_found";
} | {
    kind: "event_not_active";
} | {
    kind: "sold_out";
} | {
    kind: "order_not_found";
};
export type OrderServiceResult<T> = {
    success: true;
    value: T;
} | {
    success: false;
    failure: OrderServiceFailure;
};
const DEFAULT_RESERVATION_TTL_SECONDS = 30 * 60;
export interface OrderServiceParams {
    eventRepository?: EventRepository;
    orderRepository?: OrderRepository;
    idGenerator?: () => string;
    now?: () => Date;
    reservationTtlSeconds?: number;
}
export class OrderService {
    private readonly eventRepository: EventRepository;
    private readonly orderRepository: OrderRepository;
    private readonly idGenerator: () => string;
    private readonly now: () => Date;
    private readonly reservationTtlSeconds: number;
    constructor(params: OrderServiceParams = {}) {
        this.eventRepository = params.eventRepository ?? new EventRepository();
        this.orderRepository = params.orderRepository ?? new OrderRepository();
        this.idGenerator = params.idGenerator ?? randomUUID;
        this.now = params.now ?? (() => new Date());
        this.reservationTtlSeconds =
            params.reservationTtlSeconds ?? DEFAULT_RESERVATION_TTL_SECONDS;
    }
    async create(params: {
        input: unknown;
        customerId: string;
    }): Promise<OrderServiceResult<Order>> {
        const { input, customerId } = params;
        const parsed = createOrderInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }
        const { eventId, quantity } = parsed.data;
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            return { success: false, failure: { kind: "event_not_found" } };
        }
        if (event.status !== "ACTIVE") {
            return { success: false, failure: { kind: "event_not_active" } };
        }
        const reserved = await this.eventRepository.decrementAvailableTickets({
            id: eventId,
            quantity,
        });
        if (!reserved) {
            return { success: false, failure: { kind: "sold_out" } };
        }
        const nowDate = this.now();
        const expiresAt = new Date(nowDate.getTime() + this.reservationTtlSeconds * 1000);
        const order: Order = {
            id: this.idGenerator(),
            customerId,
            eventId,
            quantity,
            status: "PENDING",
            totalAmountInCents: event.priceInCents * quantity,
            currency: event.currency,
            expiresAt: expiresAt.toISOString(),
            createdAt: nowDate.toISOString(),
            updatedAt: nowDate.toISOString(),
        };
        const created = await this.orderRepository.create(order);
        return { success: true, value: created };
    }
    async getById(params: {
        id: string;
        customerId: string;
    }): Promise<OrderServiceResult<Order>> {
        const { id, customerId } = params;
        const parsed = orderIdParamSchema.safeParse(id);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }
        const order = await this.orderRepository.findById(parsed.data);
        if (!order || order.customerId !== customerId) {
            return { success: false, failure: { kind: "order_not_found" } };
        }
        return { success: true, value: order };
    }
}
