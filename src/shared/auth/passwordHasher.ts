import { createHmac, randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";
import { SecretsProvider } from "./secretsProvider";
export interface PasswordHasherParams {
    secretsProvider: SecretsProvider;
    memoryCost?: number;
    timeCost?: number;
    parallelism?: number;
}
const DEFAULT_MEMORY_COST = 19456;
const DEFAULT_TIME_COST = 2;
const DEFAULT_PARALLELISM = 1;
export class PasswordHasher {
    private readonly secretsProvider: SecretsProvider;
    private readonly memoryCost: number;
    private readonly timeCost: number;
    private readonly parallelism: number;
    constructor(params: PasswordHasherParams) {
        this.secretsProvider = params.secretsProvider;
        this.memoryCost = params.memoryCost ?? DEFAULT_MEMORY_COST;
        this.timeCost = params.timeCost ?? DEFAULT_TIME_COST;
        this.parallelism = params.parallelism ?? DEFAULT_PARALLELISM;
    }
    async hash(params: {
        password: string;
    }): Promise<string> {
        const peppered = await this.applyPepper({ password: params.password });
        return argon2id({
            password: peppered,
            salt: randomBytes(16),
            iterations: this.timeCost,
            memorySize: this.memoryCost,
            parallelism: this.parallelism,
            hashLength: 32,
            outputType: "encoded",
        });
    }
    async verify(params: {
        password: string;
        passwordHash: string;
    }): Promise<boolean> {
        const peppered = await this.applyPepper({ password: params.password });
        try {
            return await argon2Verify({
                password: peppered,
                hash: params.passwordHash,
            });
        }
        catch {
            return false;
        }
    }
    private async applyPepper(params: {
        password: string;
    }): Promise<string> {
        const pepper = await this.secretsProvider.getPepper();
        return createHmac("sha256", pepper)
            .update(params.password)
            .digest("base64url");
    }
}
