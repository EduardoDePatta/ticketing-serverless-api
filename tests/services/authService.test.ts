import type { RefreshToken } from "../../src/entities/refreshToken";
import type { Role, User } from "../../src/entities/user";
import type { RefreshTokenRepository } from "../../src/repositories/refreshTokenRepository";
import type { UserRepository } from "../../src/repositories/userRepository";
import { AuthService } from "../../src/services/authService";
import type { JwtAccessTokens } from "../../src/shared/auth/jwtAccessTokens";
import type { PasswordHasher } from "../../src/shared/auth/passwordHasher";
import { hashRefreshTokenSecret } from "../../src/shared/auth/refreshTokenCodec";

function makeStoredUser(overrides: Partial<User> = {}): User {
    return {
        id: "u-1",
        email: "user@example.com",
        passwordHash: "stored-hash",
        name: "Alice",
        role: "CUSTOMER",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

describe("AuthService", () => {
    const userFindByEmail = jest.fn();
    const userFindById = jest.fn();
    const userCreate = jest.fn();
    const refreshFindById = jest.fn();
    const refreshCreate = jest.fn();
    const refreshMarkRevoked = jest.fn();
    const refreshRevokeFamily = jest.fn();
    const passwordHash = jest.fn();
    const passwordVerify = jest.fn();
    const jwtSign = jest.fn();

    const userRepository = {
        findByEmail: userFindByEmail,
        findById: userFindById,
        create: userCreate,
    } as unknown as UserRepository;
    const refreshTokenRepository = {
        findById: refreshFindById,
        create: refreshCreate,
        markRevoked: refreshMarkRevoked,
        revokeFamily: refreshRevokeFamily,
    } as unknown as RefreshTokenRepository;
    const passwordHasher = {
        hash: passwordHash,
        verify: passwordVerify,
    } as unknown as PasswordHasher;
    const jwtAccessTokens = {
        sign: jwtSign,
    } as unknown as JwtAccessTokens;

    const fixedNowMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const refreshTtlSeconds = 60 * 60 * 24 * 30;
    let idCounter = 0;
    const idGenerator = jest.fn();

    function makeService(): AuthService {
        return new AuthService({
            userRepository,
            refreshTokenRepository,
            passwordHasher,
            jwtAccessTokens,
            refreshTtlSeconds,
            clock: () => fixedNowMs,
            idGenerator,
        });
    }

    beforeEach(() => {
        idCounter = 0;
        idGenerator.mockReset();
        idGenerator.mockImplementation(() => `id-${++idCounter}`);
        userFindByEmail.mockReset();
        userFindById.mockReset();
        userCreate.mockReset();
        refreshFindById.mockReset();
        refreshCreate.mockReset();
        refreshMarkRevoked.mockReset();
        refreshRevokeFamily.mockReset();
        passwordHash.mockReset();
        passwordVerify.mockReset();
        jwtSign.mockReset();
    });

    describe("register", () => {
        it("returns validation failure on bad input", async () => {
            const r = await makeService().register({ input: {} });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
            expect(userCreate).not.toHaveBeenCalled();
        });

        it("returns email_taken when email already exists", async () => {
            userFindByEmail.mockResolvedValue(makeStoredUser());
            const r = await makeService().register({
                input: {
                    email: "user@example.com",
                    password: "Sup3rL0ngPassword!",
                    name: "Alice",
                    role: "CUSTOMER",
                },
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("email_taken");
            }
            expect(userCreate).not.toHaveBeenCalled();
        });

        it("creates the user with hashed password and returns the public projection", async () => {
            userFindByEmail.mockResolvedValue(null);
            passwordHash.mockResolvedValue("argon-hash");
            userCreate.mockImplementation(async (u: User) => u);

            const r = await makeService().register({
                input: {
                    email: "USER@Example.COM",
                    password: "Sup3rL0ngPassword!",
                    name: "  Alice  ",
                    role: "ORGANIZER",
                },
            });

            expect(r.success).toBe(true);
            expect(passwordHash).toHaveBeenCalledWith({
                password: "Sup3rL0ngPassword!",
            });
            expect(userCreate).toHaveBeenCalledTimes(1);
            const created: User = userCreate.mock.calls[0][0];
            expect(created.email).toBe("user@example.com");
            expect(created.name).toBe("Alice");
            expect(created.role).toBe("ORGANIZER");
            expect(created.passwordHash).toBe("argon-hash");
            expect(created.id).toBe("id-1");

            if (r.success) {
                const value = r.value as { id: string; email: string };
                expect(value.email).toBe("user@example.com");
                expect(value.id).toBe("id-1");
                expect(
                    (value as unknown as Record<string, unknown>).passwordHash
                ).toBeUndefined();
            }
        });
    });

    describe("login", () => {
        const validInput = {
            email: "user@example.com",
            password: "Sup3rL0ngPassword!",
        };

        it("returns validation failure on bad input", async () => {
            const r = await makeService().login({ input: {} });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
        });

        it("returns invalid_credentials when user is missing", async () => {
            userFindByEmail.mockResolvedValue(null);
            const r = await makeService().login({ input: validInput });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_credentials");
            }
            expect(passwordVerify).not.toHaveBeenCalled();
        });

        it("returns invalid_credentials when password mismatches", async () => {
            userFindByEmail.mockResolvedValue(makeStoredUser());
            passwordVerify.mockResolvedValue(false);
            const r = await makeService().login({ input: validInput });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_credentials");
            }
            expect(jwtSign).not.toHaveBeenCalled();
        });

        it("issues access + refresh tokens for valid credentials", async () => {
            const stored = makeStoredUser();
            userFindByEmail.mockResolvedValue(stored);
            passwordVerify.mockResolvedValue(true);
            jwtSign.mockResolvedValue({
                token: "access-jwt",
                expiresAtEpochSeconds: Math.floor(fixedNowMs / 1000) + 900,
            });
            refreshCreate.mockImplementation(async (rt: RefreshToken) => rt);

            const r = await makeService().login({ input: validInput });

            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.accessToken).toBe("access-jwt");
                expect(typeof r.value.refreshToken).toBe("string");
                expect(r.value.refreshToken.includes(".")).toBe(true);
                expect(r.value.user.id).toBe(stored.id);
                expect(
                    (r.value.user as unknown as Record<string, unknown>)
                        .passwordHash
                ).toBeUndefined();
            }
            expect(jwtSign).toHaveBeenCalledWith({
                userId: stored.id,
                role: stored.role,
            });
            expect(refreshCreate).toHaveBeenCalledTimes(1);
            const persisted: RefreshToken = refreshCreate.mock.calls[0][0];
            expect(persisted.userId).toBe(stored.id);
            expect(persisted.familyId).toBe("id-1");
            expect(persisted.id).toBe("id-2");
            expect(persisted.expiresAtEpoch).toBe(
                Math.floor(fixedNowMs / 1000) + refreshTtlSeconds
            );
            expect(persisted.tokenHash).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    describe("refresh", () => {
        function setStoredRefresh(overrides: Partial<RefreshToken> = {}): RefreshToken {
            return {
                id: "rt-id",
                userId: "u-1",
                familyId: "fam-1",
                tokenHash: "stored-hash",
                expiresAt: new Date(fixedNowMs + 60_000).toISOString(),
                expiresAtEpoch: Math.floor(fixedNowMs / 1000) + 60,
                createdAt: new Date(fixedNowMs - 60_000).toISOString(),
                ...overrides,
            };
        }

        it("returns invalid_refresh_token for unparseable tokens", async () => {
            const r = await makeService().refresh({
                input: { refreshToken: "garbage" },
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_refresh_token");
            }
        });

        it("returns invalid_refresh_token when id is unknown", async () => {
            refreshFindById.mockResolvedValue(null);
            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.somesecret" },
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_refresh_token");
            }
        });

        it("returns invalid_refresh_token when secret hash mismatches", async () => {
            refreshFindById.mockResolvedValue(setStoredRefresh());
            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.wrongsecret" },
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_refresh_token");
            }
            expect(refreshRevokeFamily).not.toHaveBeenCalled();
        });

        it("revokes the entire family on reuse and returns reuse_detected", async () => {
            const stored = setStoredRefresh({
                tokenHash: hashRefreshTokenSecret({ secret: "mysecret" }),
                revokedAt: new Date(fixedNowMs - 30_000).toISOString(),
                replacedById: "rt-newer",
            });
            refreshFindById.mockResolvedValue(stored);

            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.mysecret" },
            });

            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("reuse_detected");
            }
            expect(refreshRevokeFamily).toHaveBeenCalledWith({
                familyId: "fam-1",
                revokedAt: expect.any(String),
            });
        });

        it("returns invalid_refresh_token when stored token has expired", async () => {
            const stored = setStoredRefresh({
                tokenHash: hashRefreshTokenSecret({ secret: "mysecret" }),
                expiresAtEpoch: Math.floor(fixedNowMs / 1000) - 10,
            });
            refreshFindById.mockResolvedValue(stored);

            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.mysecret" },
            });

            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_refresh_token");
            }
        });

        it("rotates the token, links replacedById, and reuses familyId", async () => {
            const stored = setStoredRefresh({
                tokenHash: hashRefreshTokenSecret({ secret: "mysecret" }),
            });
            refreshFindById.mockResolvedValue(stored);
            userFindById.mockResolvedValue(makeStoredUser());
            jwtSign.mockResolvedValue({
                token: "new-access-jwt",
                expiresAtEpochSeconds: Math.floor(fixedNowMs / 1000) + 900,
            });
            refreshCreate.mockImplementation(async (rt: RefreshToken) => rt);

            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.mysecret" },
            });

            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.accessToken).toBe("new-access-jwt");
                expect(r.value.refreshToken).toMatch(/^id-1\..+$/);
            }
            const created: RefreshToken = refreshCreate.mock.calls[0][0];
            expect(created.id).toBe("id-1");
            expect(created.familyId).toBe("fam-1");
            expect(created.userId).toBe("u-1");
            expect(refreshMarkRevoked).toHaveBeenCalledWith({
                id: "rt-id",
                revokedAt: expect.any(String),
                replacedById: "id-1",
            });
        });

        it("returns user_not_found when the user disappeared", async () => {
            const stored = setStoredRefresh({
                tokenHash: hashRefreshTokenSecret({ secret: "mysecret" }),
            });
            refreshFindById.mockResolvedValue(stored);
            userFindById.mockResolvedValue(null);

            const r = await makeService().refresh({
                input: { refreshToken: "rt-id.mysecret" },
            });

            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("invalid_refresh_token");
            }
        });
    });

    describe("logout", () => {
        it("returns success but no-op when token is unparseable", async () => {
            const r = await makeService().logout({
                input: { refreshToken: "garbage" },
            });
            expect(r.success).toBe(true);
            expect(refreshMarkRevoked).not.toHaveBeenCalled();
        });

        it("revokes the stored token when secret matches", async () => {
            refreshFindById.mockResolvedValue({
                id: "rt-id",
                userId: "u-1",
                familyId: "fam-1",
                tokenHash: hashRefreshTokenSecret({ secret: "mysecret" }),
                expiresAt: new Date(fixedNowMs + 60_000).toISOString(),
                expiresAtEpoch: Math.floor(fixedNowMs / 1000) + 60,
                createdAt: new Date(fixedNowMs).toISOString(),
            } as RefreshToken);

            const r = await makeService().logout({
                input: { refreshToken: "rt-id.mysecret" },
            });
            expect(r.success).toBe(true);
            expect(refreshMarkRevoked).toHaveBeenCalledWith({
                id: "rt-id",
                revokedAt: expect.any(String),
            });
        });

        it("does nothing when secret mismatches (no info leak)", async () => {
            refreshFindById.mockResolvedValue({
                id: "rt-id",
                userId: "u-1",
                familyId: "fam-1",
                tokenHash: "stored-hash",
                expiresAt: new Date(fixedNowMs + 60_000).toISOString(),
                expiresAtEpoch: Math.floor(fixedNowMs / 1000) + 60,
                createdAt: new Date(fixedNowMs).toISOString(),
            } as RefreshToken);

            const r = await makeService().logout({
                input: { refreshToken: "rt-id.wrongsecret" },
            });
            expect(r.success).toBe(true);
            expect(refreshMarkRevoked).not.toHaveBeenCalled();
        });
    });

    describe("getById", () => {
        it("returns user_not_found when missing", async () => {
            userFindById.mockResolvedValue(null);
            const r = await makeService().getById({ id: "u-1" });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("user_not_found");
            }
        });

        it("returns the public user when present", async () => {
            const stored = makeStoredUser();
            userFindById.mockResolvedValue(stored);
            const r = await makeService().getById({ id: "u-1" });
            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.value.id).toBe("u-1");
                expect(
                    (r.value as unknown as Record<string, unknown>)
                        .passwordHash
                ).toBeUndefined();
            }
        });
    });

    describe("RBAC enum", () => {
        it("rejects invalid roles in register", async () => {
            const service = makeService();
            const r = await service.register({
                input: {
                    email: "x@y.com",
                    password: "Sup3rL0ngPassword!",
                    name: "X",
                    role: "ADMIN" as Role,
                },
            });
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.failure.kind).toBe("validation");
            }
        });
    });
});
