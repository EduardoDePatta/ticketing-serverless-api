import { randomUUID } from "node:crypto";
import { RefreshToken } from "../entities/refreshToken";
import { PublicUser, User, toPublicUser } from "../entities/user";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository";
import { UserRepository } from "../repositories/userRepository";
import { JwtAccessTokens } from "../shared/auth/jwtAccessTokens";
import { PasswordHasher } from "../shared/auth/passwordHasher";
import { decodeRefreshToken, encodeRefreshToken, generateRefreshTokenSecret, hashRefreshTokenSecret, } from "../shared/auth/refreshTokenCodec";
import { loginInputSchema, logoutInputSchema, refreshInputSchema, registerInputSchema, } from "../validation/auth";
import { zodErrorToFieldErrors } from "../validation/zodErrorToFieldErrors";
export type AuthServiceFailure = {
    kind: "validation";
    fields: Record<string, string>;
} | {
    kind: "email_taken";
} | {
    kind: "invalid_credentials";
} | {
    kind: "invalid_refresh_token";
} | {
    kind: "reuse_detected";
} | {
    kind: "user_not_found";
};
export type AuthServiceResult<T> = {
    success: true;
    value: T;
} | {
    success: false;
    failure: AuthServiceFailure;
};
export interface AuthSession {
    user: PublicUser;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
}
export interface AuthServiceParams {
    userRepository: UserRepository;
    refreshTokenRepository: RefreshTokenRepository;
    passwordHasher: PasswordHasher;
    jwtAccessTokens: JwtAccessTokens;
    refreshTtlSeconds: number;
    clock?: () => number;
    idGenerator?: () => string;
}
export class AuthService {
    private readonly userRepository: UserRepository;
    private readonly refreshTokenRepository: RefreshTokenRepository;
    private readonly passwordHasher: PasswordHasher;
    private readonly jwtAccessTokens: JwtAccessTokens;
    private readonly refreshTtlSeconds: number;
    private readonly clock: () => number;
    private readonly idGenerator: () => string;
    constructor(params: AuthServiceParams) {
        this.userRepository = params.userRepository;
        this.refreshTokenRepository = params.refreshTokenRepository;
        this.passwordHasher = params.passwordHasher;
        this.jwtAccessTokens = params.jwtAccessTokens;
        this.refreshTtlSeconds = params.refreshTtlSeconds;
        this.clock = params.clock ?? Date.now;
        this.idGenerator = params.idGenerator ?? randomUUID;
    }
    async register(params: {
        input: unknown;
    }): Promise<AuthServiceResult<PublicUser>> {
        const parsed = registerInputSchema.safeParse(params.input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }
        const existing = await this.userRepository.findByEmail(parsed.data.email);
        if (existing) {
            return { success: false, failure: { kind: "email_taken" } };
        }
        const passwordHash = await this.passwordHasher.hash({
            password: parsed.data.password,
        });
        const now = new Date(this.clock()).toISOString();
        const user: User = {
            id: this.idGenerator(),
            email: parsed.data.email,
            passwordHash,
            name: parsed.data.name,
            role: parsed.data.role,
            createdAt: now,
            updatedAt: now,
        };
        const created = await this.userRepository.create(user);
        return { success: true, value: toPublicUser(created) };
    }
    async login(params: {
        input: unknown;
    }): Promise<AuthServiceResult<AuthSession>> {
        const parsed = loginInputSchema.safeParse(params.input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }
        const user = await this.userRepository.findByEmail(parsed.data.email);
        if (!user) {
            return { success: false, failure: { kind: "invalid_credentials" } };
        }
        const passwordOk = await this.passwordHasher.verify({
            password: parsed.data.password,
            passwordHash: user.passwordHash,
        });
        if (!passwordOk) {
            return { success: false, failure: { kind: "invalid_credentials" } };
        }
        const familyId = this.idGenerator();
        const session = await this.issueSession({ user, familyId });
        return { success: true, value: session };
    }
    async refresh(params: {
        input: unknown;
    }): Promise<AuthServiceResult<AuthSession>> {
        const parsed = refreshInputSchema.safeParse(params.input);
        if (!parsed.success) {
            return {
                success: false,
                failure: {
                    kind: "validation",
                    fields: zodErrorToFieldErrors({ error: parsed.error }),
                },
            };
        }
        const decoded = decodeRefreshToken({ token: parsed.data.refreshToken });
        if (!decoded.ok) {
            return {
                success: false,
                failure: { kind: "invalid_refresh_token" },
            };
        }
        const stored = await this.refreshTokenRepository.findById(decoded.id);
        if (!stored) {
            return {
                success: false,
                failure: { kind: "invalid_refresh_token" },
            };
        }
        const expectedHash = hashRefreshTokenSecret({ secret: decoded.secret });
        if (!this.constantTimeEqual(expectedHash, stored.tokenHash)) {
            return {
                success: false,
                failure: { kind: "invalid_refresh_token" },
            };
        }
        const nowIso = new Date(this.clock()).toISOString();
        if (stored.revokedAt) {
            await this.refreshTokenRepository.revokeFamily({
                familyId: stored.familyId,
                revokedAt: nowIso,
            });
            return { success: false, failure: { kind: "reuse_detected" } };
        }
        const nowSeconds = Math.floor(this.clock() / 1000);
        if (stored.expiresAtEpoch <= nowSeconds) {
            return {
                success: false,
                failure: { kind: "invalid_refresh_token" },
            };
        }
        const user = await this.userRepository.findById(stored.userId);
        if (!user) {
            return {
                success: false,
                failure: { kind: "invalid_refresh_token" },
            };
        }
        const newSession = await this.issueSession({
            user,
            familyId: stored.familyId,
        });
        const newRefreshIdMatch = decodeRefreshToken({ token: newSession.refreshToken });
        const newId = newRefreshIdMatch.ok ? newRefreshIdMatch.id : "";
        await this.refreshTokenRepository.markRevoked({
            id: stored.id,
            revokedAt: nowIso,
            replacedById: newId,
        });
        return { success: true, value: newSession };
    }
    async logout(params: {
        input: unknown;
    }): Promise<AuthServiceResult<void>> {
        const parsed = logoutInputSchema.safeParse(params.input);
        if (!parsed.success) {
            return { success: true, value: undefined };
        }
        const decoded = decodeRefreshToken({ token: parsed.data.refreshToken });
        if (!decoded.ok) {
            return { success: true, value: undefined };
        }
        const stored = await this.refreshTokenRepository.findById(decoded.id);
        if (!stored) {
            return { success: true, value: undefined };
        }
        const expectedHash = hashRefreshTokenSecret({ secret: decoded.secret });
        if (!this.constantTimeEqual(expectedHash, stored.tokenHash)) {
            return { success: true, value: undefined };
        }
        if (stored.revokedAt) {
            return { success: true, value: undefined };
        }
        await this.refreshTokenRepository.markRevoked({
            id: stored.id,
            revokedAt: new Date(this.clock()).toISOString(),
        });
        return { success: true, value: undefined };
    }
    async getById(params: {
        id: string;
    }): Promise<AuthServiceResult<PublicUser>> {
        const user = await this.userRepository.findById(params.id);
        if (!user) {
            return { success: false, failure: { kind: "user_not_found" } };
        }
        return { success: true, value: toPublicUser(user) };
    }
    private async issueSession(params: {
        user: User;
        familyId: string;
    }): Promise<AuthSession> {
        const { user, familyId } = params;
        const accessSigned = await this.jwtAccessTokens.sign({
            userId: user.id,
            role: user.role,
        });
        const accessTokenExpiresAt = new Date(accessSigned.expiresAtEpochSeconds * 1000).toISOString();
        const refreshId = this.idGenerator();
        const refreshSecret = generateRefreshTokenSecret();
        const tokenHash = hashRefreshTokenSecret({ secret: refreshSecret });
        const nowMs = this.clock();
        const expiresAtEpoch = Math.floor(nowMs / 1000) + this.refreshTtlSeconds;
        const expiresAt = new Date(expiresAtEpoch * 1000).toISOString();
        const refreshEntity: RefreshToken = {
            id: refreshId,
            userId: user.id,
            familyId,
            tokenHash,
            expiresAt,
            expiresAtEpoch,
            createdAt: new Date(nowMs).toISOString(),
        };
        await this.refreshTokenRepository.create(refreshEntity);
        const refreshToken = encodeRefreshToken({
            id: refreshId,
            secret: refreshSecret,
        });
        return {
            user: toPublicUser(user),
            accessToken: accessSigned.token,
            accessTokenExpiresAt,
            refreshToken,
            refreshTokenExpiresAt: expiresAt,
        };
    }
    private constantTimeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }
        let diff = 0;
        for (let i = 0; i < a.length; i++) {
            diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return diff === 0;
    }
}
