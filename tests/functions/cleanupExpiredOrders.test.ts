import type { Order } from "../../src/entities/order";

const mockFindExpiredPending = jest.fn();
const mockMarkExpired = jest.fn();
const mockIncrement = jest.fn();

jest.mock("../../src/repositories/orderRepository", () => ({
    OrderRepository: jest.fn().mockImplementation(() => ({
        findExpiredPending: (...args: unknown[]) =>
            mockFindExpiredPending(...args),
        markExpired: (...args: unknown[]) => mockMarkExpired(...args),
    })),
}));

jest.mock("../../src/repositories/eventRepository", () => ({
    EventRepository: jest.fn().mockImplementation(() => ({
        incrementAvailableTickets: (...args: unknown[]) =>
            mockIncrement(...args),
    })),
}));

import { handler } from "../../src/functions/cleanupExpiredOrders";

function order(overrides: Partial<Order>): Order {
    return {
        id: "ord-1",
        customerId: "u-1",
        eventId: "evt-1",
        quantity: 2,
        status: "PENDING",
        totalAmountInCents: 2000,
        currency: "USD",
        expiresAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

describe("cleanupExpiredOrders handler", () => {
    beforeEach(() => {
        mockFindExpiredPending.mockReset();
        mockMarkExpired.mockReset();
        mockIncrement.mockReset();
    });

    it("queries expired pending orders, marks them expired and returns tickets", async () => {
        const expired = [
            order({ id: "ord-1", eventId: "evt-1", quantity: 2 }),
            order({ id: "ord-2", eventId: "evt-2", quantity: 1 }),
        ];
        mockFindExpiredPending.mockResolvedValue(expired);
        mockMarkExpired.mockResolvedValue(true);

        const result = await handler();

        expect(mockFindExpiredPending).toHaveBeenCalledTimes(1);
        const queryArgs = mockFindExpiredPending.mock.calls[0][0];
        expect(typeof queryArgs.cutoff).toBe("string");

        expect(mockMarkExpired).toHaveBeenCalledTimes(2);
        expect(mockIncrement).toHaveBeenCalledTimes(2);
        expect(mockIncrement).toHaveBeenCalledWith({
            id: "evt-1",
            quantity: 2,
        });
        expect(mockIncrement).toHaveBeenCalledWith({
            id: "evt-2",
            quantity: 1,
        });

        expect(result.expired).toBe(2);
        expect(result.scanned).toBe(2);
    });

    it("does not roll back tickets when markExpired loses the race", async () => {
        mockFindExpiredPending.mockResolvedValue([
            order({ id: "ord-1", quantity: 2 }),
        ]);
        mockMarkExpired.mockResolvedValue(false);

        const result = await handler();

        expect(mockIncrement).not.toHaveBeenCalled();
        expect(result.expired).toBe(0);
        expect(result.scanned).toBe(1);
    });

    it("returns zero when nothing is expired", async () => {
        mockFindExpiredPending.mockResolvedValue([]);
        const result = await handler();
        expect(result).toEqual({ expired: 0, scanned: 0 });
        expect(mockMarkExpired).not.toHaveBeenCalled();
        expect(mockIncrement).not.toHaveBeenCalled();
    });
});
