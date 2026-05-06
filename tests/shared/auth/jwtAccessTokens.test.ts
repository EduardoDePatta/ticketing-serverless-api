import { JwtAccessTokens } from "../../../src/shared/auth/jwtAccessTokens";
import type { SecretsProvider } from "../../../src/shared/auth/secretsProvider";

function makeSecretsProvider(jwtKey: string): SecretsProvider {
  return {
    getPepper: jest.fn(async () => "unused"),
    getJwtSigningKey: jest.fn(async () => jwtKey),
  };
}

describe("JwtAccessTokens", () => {
  it("signs a token and verifies it round trip with claims", async () => {
    const tokens = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k1"),
      issuer: "ticketing-api",
      audience: "ticketing-clients",
      ttlSeconds: 60,
    });
    const signed = await tokens.sign({
      userId: "u-1",
      role: "CUSTOMER",
    });
    expect(typeof signed.token).toBe("string");
    expect(signed.expiresAtEpochSeconds).toBeGreaterThan(Math.floor(Date.now() / 1000));
    const verified = await tokens.verify({ token: signed.token });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.userId).toBe("u-1");
      expect(verified.payload.role).toBe("CUSTOMER");
    }
  });
  it("returns ok=false when key changes between sign and verify", async () => {
    const signer = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("kA"),
      issuer: "i",
      audience: "a",
      ttlSeconds: 60,
    });
    const verifier = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("kB"),
      issuer: "i",
      audience: "a",
      ttlSeconds: 60,
    });
    const signed = await signer.sign({
      userId: "u-1",
      role: "CUSTOMER",
    });
    const result = await verifier.verify({ token: signed.token });
    expect(result.ok).toBe(false);
  });
  it("returns ok=false when token is malformed", async () => {
    const tokens = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k"),
      issuer: "i",
      audience: "a",
      ttlSeconds: 60,
    });
    const result = await tokens.verify({ token: "not-a-jwt" });
    expect(result.ok).toBe(false);
  });
  it("returns ok=false when token is expired", async () => {
    const tokens = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k"),
      issuer: "i",
      audience: "a",
      ttlSeconds: 1,
      clock: () => 1000,
    });
    const signed = await tokens.sign({
      userId: "u-1",
      role: "CUSTOMER",
    });
    const verifierLater = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k"),
      issuer: "i",
      audience: "a",
      ttlSeconds: 1,
      clock: () => 99999,
    });
    const result = await verifierLater.verify({ token: signed.token });
    expect(result.ok).toBe(false);
  });
  it("rejects tokens with the wrong issuer", async () => {
    const signer = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k"),
      issuer: "issuer-A",
      audience: "a",
      ttlSeconds: 60,
    });
    const verifier = new JwtAccessTokens({
      secretsProvider: makeSecretsProvider("k"),
      issuer: "issuer-B",
      audience: "a",
      ttlSeconds: 60,
    });
    const signed = await signer.sign({
      userId: "u-1",
      role: "CUSTOMER",
    });
    const r = await verifier.verify({ token: signed.token });
    expect(r.ok).toBe(false);
  });
});
