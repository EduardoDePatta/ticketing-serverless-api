import { AwsSecretsProvider } from "../../../src/shared/auth/secretsProvider";

describe("AwsSecretsProvider", () => {
    const send = jest.fn();
    const client = { send } as unknown as ConstructorParameters<
        typeof AwsSecretsProvider
    >[0]["client"];

    function makeProvider(): AwsSecretsProvider {
        return new AwsSecretsProvider({
            pepperSecretId: "pepper-id",
            jwtSigningKeySecretId: "jwt-id",
            client,
        });
    }

    beforeEach(() => {
        send.mockReset();
    });

    it("returns the SecretString from Secrets Manager", async () => {
        send.mockResolvedValueOnce({ SecretString: "pepper-value" });
        const provider = makeProvider();
        const value = await provider.getPepper();
        expect(value).toBe("pepper-value");
    });

    it("caches the pepper across calls (single SDK invocation)", async () => {
        send.mockResolvedValueOnce({ SecretString: "pepper-value" });
        const provider = makeProvider();
        await provider.getPepper();
        await provider.getPepper();
        await provider.getPepper();
        expect(send).toHaveBeenCalledTimes(1);
    });

    it("caches pepper and jwt key independently", async () => {
        send.mockImplementation(async (command: { input: { SecretId: string } }) => {
            if (command.input.SecretId === "pepper-id") {
                return { SecretString: "p" };
            }
            return { SecretString: "j" };
        });
        const provider = makeProvider();
        const [pepper, jwt, pepperAgain, jwtAgain] = await Promise.all([
            provider.getPepper(),
            provider.getJwtSigningKey(),
            provider.getPepper(),
            provider.getJwtSigningKey(),
        ]);
        expect(pepper).toBe("p");
        expect(pepperAgain).toBe("p");
        expect(jwt).toBe("j");
        expect(jwtAgain).toBe("j");
        expect(send).toHaveBeenCalledTimes(2);
    });

    it("throws when SecretString is missing", async () => {
        send.mockResolvedValueOnce({});
        const provider = makeProvider();
        await expect(provider.getPepper()).rejects.toThrow(/pepper-id/);
    });

    it("uses the configured secret ids when calling Secrets Manager", async () => {
        send.mockResolvedValueOnce({ SecretString: "v" });
        const provider = makeProvider();
        await provider.getJwtSigningKey();
        const cmd = send.mock.calls[0][0];
        expect(cmd.input.SecretId).toBe("jwt-id");
    });
});
