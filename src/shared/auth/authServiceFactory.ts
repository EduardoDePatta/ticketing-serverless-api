import { RefreshTokenRepository } from "../../repositories/refreshTokenRepository";
import { UserRepository } from "../../repositories/userRepository";
import { AuthService } from "../../services/authService";
import { requireEnv } from "../env";
import { JwtAccessTokens } from "./jwtAccessTokens";
import { PasswordHasher } from "./passwordHasher";
import { getDefaultSecretsProvider } from "./secretsProvider";
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
let cachedService: AuthService | null = null;
export function getDefaultAuthService(): AuthService {
    if (cachedService) {
        return cachedService;
    }
    const secretsProvider = getDefaultSecretsProvider();
    cachedService = new AuthService({
        userRepository: new UserRepository(),
        refreshTokenRepository: new RefreshTokenRepository(),
        passwordHasher: new PasswordHasher({ secretsProvider }),
        jwtAccessTokens: new JwtAccessTokens({
            secretsProvider,
            issuer: requireEnv("AUTH_JWT_ISSUER"),
            audience: requireEnv("AUTH_JWT_AUDIENCE"),
            ttlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ??
                DEFAULT_ACCESS_TOKEN_TTL_SECONDS),
        }),
        refreshTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ??
            DEFAULT_REFRESH_TOKEN_TTL_SECONDS),
    });
    return cachedService;
}
export function getDefaultJwtAccessTokens(): JwtAccessTokens {
    const secretsProvider = getDefaultSecretsProvider();
    return new JwtAccessTokens({
        secretsProvider,
        issuer: requireEnv("AUTH_JWT_ISSUER"),
        audience: requireEnv("AUTH_JWT_AUDIENCE"),
        ttlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ??
            DEFAULT_ACCESS_TOKEN_TTL_SECONDS),
    });
}
