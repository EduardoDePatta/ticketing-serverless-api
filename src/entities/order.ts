export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";
export interface Order {
  id: string;
  customerId: string;
  eventId: string;
  quantity: number;
  status: OrderStatus;
  totalAmountInCents: number;
  currency: string;
  expiresAt: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}
