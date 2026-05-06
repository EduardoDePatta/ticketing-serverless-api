import { GetSecretValueCommand, SecretsManagerClient, } from "@aws-sdk/client-secrets-manager";
import { requireEnv } from "../env";
export interface SecretsProvider {
    getPepper(): Promise<string>;
    getJwtSigningKey(): Promise<string>;
}
export interface SecretsProviderParams {
    pepperSecretId: string;
    jwtSigningKeySecretId: string;
    client?: SecretsManagerClient;
}
export class AwsSecretsProvider implements SecretsProvider {
    private readonly pepperSecretId: string;
    private readonly jwtSigningKeySecretId: string;
    private readonly client: SecretsManagerClient;
    private pepperCache: string | null = null;
    private pepperPending: Promise<string> | null = null;
    private jwtSigningKeyCache: string | null = null;
    private jwtSigningKeyPending: Promise<string> | null = null;
    constructor(params: SecretsProviderParams) {
        this.pepperSecretId = params.pepperSecretId;
        this.jwtSigningKeySecretId = params.jwtSigningKeySecretId;
        this.client = params.client ?? new SecretsManagerClient({});
    }
    async getPepper(): Promise<string> {
        if (this.pepperCache !== null) {
            return this.pepperCache;
        }
        if (!this.pepperPending) {
            this.pepperPending = this.fetchSecret({
                secretId: this.pepperSecretId,
            }).then((value) => {
                this.pepperCache = value;
                return value;
            });
        }
        try {
            return await this.pepperPending;
        }
        finally {
            this.pepperPending = null;
        }
    }
    async getJwtSigningKey(): Promise<string> {
        if (this.jwtSigningKeyCache !== null) {
            return this.jwtSigningKeyCache;
        }
        if (!this.jwtSigningKeyPending) {
            this.jwtSigningKeyPending = this.fetchSecret({
                secretId: this.jwtSigningKeySecretId,
            }).then((value) => {
                this.jwtSigningKeyCache = value;
                return value;
            });
        }
        try {
            return await this.jwtSigningKeyPending;
        }
        finally {
            this.jwtSigningKeyPending = null;
        }
    }
    private async fetchSecret(params: {
        secretId: string;
    }): Promise<string> {
        const result = await this.client.send(new GetSecretValueCommand({ SecretId: params.secretId }));
        const value = result.SecretString;
        if (typeof value !== "string" || value.length === 0) {
            throw new Error(`Secret ${params.secretId} has no usable SecretString`);
        }
        return value;
    }
}
let defaultInstance: SecretsProvider | null = null;
export function getDefaultSecretsProvider(): SecretsProvider {
    if (!defaultInstance) {
        defaultInstance = new AwsSecretsProvider({
            pepperSecretId: requireEnv("AUTH_PEPPER_SECRET_ID"),
            jwtSigningKeySecretId: requireEnv("AUTH_JWT_SIGNING_KEY_SECRET_ID"),
        });
    }
    return defaultInstance;
}
