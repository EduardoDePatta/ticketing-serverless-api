import { randomUUID } from "node:crypto";

import { EventStatus, TicketingEvent, UpdateEventInput } from "../entities/event";
import { EventRepository } from "../repositories/eventRepository";
import type { infer as zInfer } from "zod";

import {
    createEventInputSchema,
    eventIdParamSchema,
    updateEventInputSchema,
} from "../validation/event";
import { zodErrorToFieldErrors } from "../validation/zodErrorToFieldErrors";

export type EventServiceFailure =
    | { kind: "validation"; fields: Record<string, string> }
    | { kind: "not_found" };

export type EventServiceResult<T> =
    | { success: true; value: T }
    | { success: false; failure: EventServiceFailure };

const DEFAULT_CURRENCY = "USD";
const DEFAULT_STATUS: EventStatus = "ACTIVE";

type UpdateEventParsed = zInfer<typeof updateEventInputSchema>;

function omitUndefinedKeys(params: { obj: UpdateEventParsed }): UpdateEventInput {
    const { obj } = params;
    return Object.fromEntries(
        Object.entries(obj).filter((entry) => entry[1] !== undefined)
    ) as UpdateEventInput;
}

export class EventService {
    private readonly repository: EventRepository;

    constructor(params?: { repository?: EventRepository }) {
        this.repository = params?.repository ?? new EventRepository();
    }

    async create(params: {
        input: unknown;
    }): Promise<EventServiceResult<TicketingEvent>> {
        const { input } = params;
        const parsed = createEventInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }

        const data = parsed.data;
        const now = new Date().toISOString();
        const event: TicketingEvent = {
            id: randomUUID(),
            name: data.name,
            description: data.description,
            date: data.date,
            location: data.location,
            priceInCents: data.priceInCents,
            currency: data.currency ?? DEFAULT_CURRENCY,
            availableTickets: data.availableTickets,
            status: DEFAULT_STATUS,
            createdAt: now,
            updatedAt: now,
        };

        const created = await this.repository.create(event);
        return { success: true, value: created };
    }

    async list(): Promise<EventServiceResult<TicketingEvent[]>> {
        const events = await this.repository.list();
        return { success: true, value: events };
    }

    async getById(params: {
        id: string;
    }): Promise<EventServiceResult<TicketingEvent>> {
        const { id } = params;
        const parsed = eventIdParamSchema.safeParse(id);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }

        const event = await this.repository.findById(parsed.data);
        if (!event) {
            return { success: false, failure: { kind: "not_found" } };
        }
        return { success: true, value: event };
    }

    async update(params: {
        id: string;
        input: unknown;
    }): Promise<EventServiceResult<TicketingEvent>> {
        const { id, input } = params;
        const idParsed = eventIdParamSchema.safeParse(id);
        if (!idParsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: idParsed.error }),
                },
            };
        }

        const parsed = updateEventInputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }

        const patch = omitUndefinedKeys({ obj: parsed.data });

        const updated = await this.repository.update({
            id: idParsed.data,
            input: patch,
        });

        if (!updated) {
            return { success: false, failure: { kind: "not_found" } };
        }

        return { success: true, value: updated };
    }

    async delete(params: { id: string }): Promise<EventServiceResult<void>> {
        const { id } = params;
        const parsed = eventIdParamSchema.safeParse(id);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }

        const deleted = await this.repository.delete(parsed.data);
        if (!deleted) {
            return { success: false, failure: { kind: "not_found" } };
        }

        return { success: true, value: undefined };
    }
}
