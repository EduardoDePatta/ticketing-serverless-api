import {
  JsonWebTokenError,
  NotBeforeError,
  sign as jwtSign,
  TokenExpiredError,
  verify as jwtVerify,
  type JwtPayload,
} from "jsonwebtoken";
import { SecretsProvider } from "./secretsProvider";
import { Role } from "../../entities/user";

const JWT_ALGORITHM = "HS256" as const;

export interface JwtAccessTokenPayload {
  userId: string;
  role: Role;
}
export type JwtVerifyResult =
  | {
      ok: true;
      payload: JwtAccessTokenPayload;
    }
  | {
      ok: false;
    };
export interface JwtAccessTokensParams {
  secretsProvider: SecretsProvider;
  issuer: string;
  audience: string;
  ttlSeconds: number;
  clock?: () => number;
}
export class JwtAccessTokens {
  private readonly secretsProvider: SecretsProvider;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly ttlSeconds: number;
  private readonly clock: () => number;
  constructor(params: JwtAccessTokensParams) {
    this.secretsProvider = params.secretsProvider;
    this.issuer = params.issuer;
    this.audience = params.audience;
    this.ttlSeconds = params.ttlSeconds;
    this.clock = params.clock ?? Date.now;
  }
  async sign(params: { userId: string; role: Role }): Promise<{
    token: string;
    expiresAtEpochSeconds: number;
  }> {
    const key = await this.secretsProvider.getJwtSigningKey();
    const issuedAt = Math.floor(this.clock() / 1000);
    const expiresAt = issuedAt + this.ttlSeconds;
    const token = jwtSign(
      {
        role: params.role,
        iat: issuedAt,
        exp: expiresAt,
      },
      key,
      {
        algorithm: JWT_ALGORITHM,
        issuer: this.issuer,
        audience: this.audience,
        subject: params.userId,
      }
    );
    return { token, expiresAtEpochSeconds: expiresAt };
  }
  async verify(params: { token: string }): Promise<JwtVerifyResult> {
    const key = await this.secretsProvider.getJwtSigningKey();
    let decoded: JwtPayload;
    try {
      const result = jwtVerify(params.token, key, {
        algorithms: [JWT_ALGORITHM],
        issuer: this.issuer,
        audience: this.audience,
        clockTimestamp: Math.floor(this.clock() / 1000),
      });
      if (typeof result === "string") {
        return { ok: false };
      }

      decoded = result;
    } catch (err) {
      if (
        err instanceof JsonWebTokenError ||
        err instanceof TokenExpiredError ||
        err instanceof NotBeforeError
      ) {
        return { ok: false };
      }

      throw err;
    }

    const subject = decoded.sub;
    const role = decoded.role;
    if (typeof subject !== "string" || subject.length === 0) {
      return { ok: false };
    }

    if (role !== "ORGANIZER" && role !== "CUSTOMER") {
      return { ok: false };
    }

    return {
      ok: true,
      payload: {
        userId: subject,
        role,
      },
    };
  }
}
