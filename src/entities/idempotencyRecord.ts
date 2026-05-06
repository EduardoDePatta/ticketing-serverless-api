export type IdempotencyStatus = "in_progress" | "completed";
export interface IdempotencyRecord {
    pk: string;
    status: IdempotencyStatus;
    requestHash: string;
    statusCode: number | null;
    responseBody: string | null;
    createdAt: string;
    expiresAtEpoch: number;
}
