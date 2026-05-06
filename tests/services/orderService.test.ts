import type { TicketingEvent } from "../../src/entities/event";
import type { Order } from "../../src/entities/order";
import type { EventRepository } from "../../src/repositories/eventRepository";
import type { OrderRepository } from "../../src/repositories/orderRepository";
import { OrderService } from "../../src/services/orderService";

describe("OrderService", () => {
    const eventFindById = jest.fn();
    const eventDecrement = jest.fn();
    const orderCreate = jest.fn();
    const orderFindById = jest.fn();
    const idGenerator = jest.fn();
    const now = jest.fn();

    const eventRepository = {
        findById: eventFindById,
        decrementAvailableTickets: eventDecrement,
    } as unknown as EventRepository;

    const orderRepository = {
        create: orderCreate,
        findById: orderFindById,
    } as unknown as OrderRepository;

    function makeService(): OrderService {
        return new OrderService({
            eventRepository,
            orderRepository,
            idGenerator,
            now,
            reservationTtlSeconds: 30 * 60,
        });
    }

    function makeEvent(
        overrides: Partial<TicketingEvent> = {}
    ): TicketingEvent {
        return {
            id: "evt-1",
            organizerId: "u-org",
            name: "Show",
            date: "2026-06-15T20:00:00.000Z",
            location: "Lisboa",
            priceInCents: 1000,
            currency: "USD",
            availableTickets: 10,
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            ...overrides,
        };
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
            expiresAt: "2026-01-01T00:30:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            ...overrides,
        };
    }

    beforeEach(() => {
        eventFindById.mockReset();
        eventDecrement.mockReset();
        orderCreate.mockReset();
        orderFindById.mockReset();
        idGenerator.mockReset();
        idGenerator.mockReturnValue("ord-1");
        now.mockReset();
        now.mockReturnValue(new Date("2026-01-01T00:00:00.000Z"));
    });

    describe("create", () => {
        it("returns validation failure when input is bad", async () => {
            const r = await makeService().create({
                input: {},
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
            expect(eventFindById).not.toHaveBeenCalled();
            expect(eventDecrement).not.toHaveBeenCalled();
            expect(orderCreate).not.toHaveBeenCalled();
        });

        it("returns event_not_found when the event does not exist", async () => {
            eventFindById.mockResolvedValue(null);
            const r = await makeService().create({
                input: { eventId: "evt-1", quantity: 2 },
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("event_not_found");
            }
            expect(eventDecrement).not.toHaveBeenCalled();
            expect(orderCreate).not.toHaveBeenCalled();
        });

        it("returns event_not_active when event status is not ACTIVE", async () => {
            eventFindById.mockResolvedValue(makeEvent({ status: "CANCELLED" }));
            const r = await makeService().create({
                input: { eventId: "evt-1", quantity: 2 },
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("event_not_active");
            }
            expect(eventDecrement).not.toHaveBeenCalled();
            expect(orderCreate).not.toHaveBeenCalled();
        });

        it("returns sold_out when ticket decrement fails", async () => {
            eventFindById.mockResolvedValue(makeEvent({ availableTickets: 1 }));
            eventDecrement.mockResolvedValue(false);
            const r = await makeService().create({
                input: { eventId: "evt-1", quantity: 2 },
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("sold_out");
            }
            expect(eventDecrement).toHaveBeenCalledWith({
                id: "evt-1",
                quantity: 2,
            });
            expect(orderCreate).not.toHaveBeenCalled();
        });

        it("persists a PENDING order tagged with the customerId", async () => {
            eventFindById.mockResolvedValue(
                makeEvent({ priceInCents: 1500, currency: "USD" })
            );
            eventDecrement.mockResolvedValue(true);
            orderCreate.mockImplementation(async (o: Order) => o);

            const r = await makeService().create({
                input: { eventId: "evt-1", quantity: 3 },
                customerId: "u-cust",
            });

            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.id).toBe("ord-1");
                expect(r.value.customerId).toBe("u-cust");
                expect(r.value.eventId).toBe("evt-1");
                expect(r.value.quantity).toBe(3);
                expect(r.value.status).toBe("PENDING");
                expect(r.value.totalAmountInCents).toBe(1500 * 3);
                expect(r.value.currency).toBe("USD");
                expect(r.value.expiresAt).toBe("2026-01-01T00:30:00.000Z");
            }
            expect(orderCreate).toHaveBeenCalledTimes(1);
            const persisted: Order = orderCreate.mock.calls[0][0];
            expect(persisted.customerId).toBe("u-cust");
            expect(persisted.status).toBe("PENDING");
        });
    });

    describe("getById", () => {
        it("returns validation failure when id is empty", async () => {
            const r = await makeService().getById({
                id: "",
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
            expect(orderFindById).not.toHaveBeenCalled();
        });

        it("returns order_not_found when the order is missing", async () => {
            orderFindById.mockResolvedValue(null);
            const r = await makeService().getById({
                id: "ord-1",
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("order_not_found");
            }
        });

        it("returns order_not_found when the caller is not the order owner", async () => {
            orderFindById.mockResolvedValue(
                makeOrder({ customerId: "someone-else" })
            );
            const r = await makeService().getById({
                id: "ord-1",
                customerId: "u-cust",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("order_not_found");
            }
        });

        it("returns the order when the caller owns it", async () => {
            orderFindById.mockResolvedValue(makeOrder({ customerId: "u-cust" }));
            const r = await makeService().getById({
                id: "ord-1",
                customerId: "u-cust",
            });
            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.id).toBe("ord-1");
                expect(r.value.customerId).toBe("u-cust");
            }
        });
    });
});
