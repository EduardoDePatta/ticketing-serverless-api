import { EventRepository } from "../repositories/eventRepository";
import { OrderRepository } from "../repositories/orderRepository";
const orderRepository = new OrderRepository();
const eventRepository = new EventRepository();
export interface CleanupExpiredOrdersResult {
    scanned: number;
    expired: number;
}
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
