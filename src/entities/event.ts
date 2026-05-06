export type EventStatus = "ACTIVE" | "CANCELLED";
export interface TicketingEvent {
  id: string;
  organizerId: string;
  name: string;
  description?: string;
  date: string;
  location: string;
  priceInCents: number;
  currency: string;
  availableTickets: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEventInput {
  name: string;
  description?: string;
  date: string;
  location: string;
  priceInCents: number;
  currency?: string;
  availableTickets: number;
}
export interface UpdateEventInput {
  name?: string;
  description?: string;
  date?: string;
  location?: string;
  priceInCents?: number;
  currency?: string;
  availableTickets?: number;
  status?: EventStatus;
}
