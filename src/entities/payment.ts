export type PaymentStatus = "succeeded" | "declined" | "error";

export interface Payment {
    id: string;
    orderId: string;
    customerId: string;
    provider: string;
    providerPaymentId: string;
    amountInCents: number;
    currency: string;
    last4: string;
    cardHolderName: string;
    billingCountry: string;
    status: PaymentStatus;
    failureReason?: string;
    createdAt: string;
}
