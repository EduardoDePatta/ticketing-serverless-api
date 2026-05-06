export interface RefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: string;
  expiresAtEpoch: number;
  createdAt: string;
  revokedAt?: string;
  replacedById?: string;
}
