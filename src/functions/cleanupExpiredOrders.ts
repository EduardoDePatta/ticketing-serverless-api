import { EventRepository } from "../repositories/eventRepository";
import { OrderRepository } from "../repositories/orderRepository";

const orderRepository = new OrderRepository();
const eventRepository = new EventRepository();

export interface CleanupExpiredOrdersResult {
    scanned: number;
    expired: number;
}

/**
 * Scheduled handler. Looks up orders that are still PENDING but whose
 * `expiresAt` is in the past, marks each as EXPIRED (atomic against payment
 * races) and returns the reserved tickets back to the event inventory.
 */
export const handler = async (): Promise<CleanupExpiredOrdersResult> => {
    const now = new Date();
    const candidates = await orderRepository.findExpiredPending({
        cutoff: now.toISOString(),
    });

    let expiredCount = 0;
    for (const order of candidates) {
        const moved = await orderRepository.markExpired({
            id: order.id,
            now,
        });
        if (!moved) {
            // Concurrent payment won the race; do not return tickets.
            continue;
        }
        await eventRepository.incrementAvailableTickets({
            id: order.eventId,
            quantity: order.quantity,
        });
        expiredCount += 1;
    }

    return { scanned: candidates.length, expired: expiredCount };
};
