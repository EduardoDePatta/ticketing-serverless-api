import type { TicketingEvent } from "../../src/entities/event";
import type { EventRepository } from "../../src/repositories/eventRepository";
import { EventService } from "../../src/services/eventService";
describe("EventService", () => {
    const create = jest.fn();
    const list = jest.fn();
    const findById = jest.fn();
    const update = jest.fn();
    const del = jest.fn();
    const repository = {
        create,
        list,
        findById,
        update,
        delete: del,
    } as unknown as EventRepository;
    function makeService(): EventService {
        return new EventService({ repository });
    }
    function makeStored(overrides: Partial<TicketingEvent> = {}): TicketingEvent {
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
    beforeEach(() => {
        create.mockReset();
        list.mockReset();
        findById.mockReset();
        update.mockReset();
        del.mockReset();
    });
    describe("create", () => {
        it("returns validation failure on bad input", async () => {
            const r = await makeService().create({
                input: {},
                organizerId: "u-org",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
            expect(create).not.toHaveBeenCalled();
        });
        it("persists the event with organizerId from the actor", async () => {
            create.mockImplementation(async (e: TicketingEvent) => e);
            const r = await makeService().create({
                input: {
                    name: "Show",
                    date: "2026-06-15T20:00:00.000Z",
                    location: "Lisboa",
                    priceInCents: 1000,
                    availableTickets: 10,
                },
                organizerId: "u-org",
            });
            expect(r.success).toBe(true);
            expect(create).toHaveBeenCalledTimes(1);
            const persisted: TicketingEvent = create.mock.calls[0][0];
            expect(persisted.organizerId).toBe("u-org");
        });
    });
    describe("update", () => {
        it("returns not_found when event is missing", async () => {
            findById.mockResolvedValue(null);
            const r = await makeService().update({
                id: "evt-1",
                input: { name: "X" },
                actorId: "u-org",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("not_found");
            }
            expect(update).not.toHaveBeenCalled();
        });
        it("returns not_found when actor is not the organizer", async () => {
            findById.mockResolvedValue(makeStored());
            const r = await makeService().update({
                id: "evt-1",
                input: { name: "X" },
                actorId: "different-user",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("not_found");
            }
            expect(update).not.toHaveBeenCalled();
        });
        it("updates the event when the actor is the organizer", async () => {
            const stored = makeStored();
            findById.mockResolvedValue(stored);
            update.mockResolvedValue({ ...stored, name: "Renamed" });
            const r = await makeService().update({
                id: "evt-1",
                input: { name: "Renamed" },
                actorId: stored.organizerId,
            });
            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.name).toBe("Renamed");
            }
        });
    });
    describe("delete", () => {
        it("returns not_found when event is missing", async () => {
            findById.mockResolvedValue(null);
            const r = await makeService().delete({
                id: "evt-1",
                actorId: "u-org",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("not_found");
            }
            expect(del).not.toHaveBeenCalled();
        });
        it("returns not_found when actor is not the organizer", async () => {
            findById.mockResolvedValue(makeStored());
            const r = await makeService().delete({
                id: "evt-1",
                actorId: "different-user",
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("not_found");
            }
            expect(del).not.toHaveBeenCalled();
        });
        it("deletes when actor matches organizer", async () => {
            const stored = makeStored();
            findById.mockResolvedValue(stored);
            del.mockResolvedValue(true);
            const r = await makeService().delete({
                id: "evt-1",
                actorId: stored.organizerId,
            });
            expect(r.success).toBe(true);
        });
    });
    describe("getById and list", () => {
        it("returns the stored event regardless of caller (public endpoint)", async () => {
            findById.mockResolvedValue(makeStored());
            const r = await makeService().getById({ id: "evt-1" });
            expect(r.success).toBe(true);
        });
        it("list returns events", async () => {
            list.mockResolvedValue([makeStored()]);
            const r = await makeService().list();
            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value).toHaveLength(1);
            }
        });
    });
});
