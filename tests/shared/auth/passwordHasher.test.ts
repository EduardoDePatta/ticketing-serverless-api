import { PasswordHasher } from "../../../src/shared/auth/passwordHasher";
import type { SecretsProvider } from "../../../src/shared/auth/secretsProvider";

function makeSecretsProvider(pepper: string): SecretsProvider {
  return {
    getPepper: jest.fn(async () => pepper),
    getJwtSigningKey: jest.fn(async () => "unused"),
  };
}

describe("PasswordHasher", () => {
  it("produces different hashes for the same password (random salt)", async () => {
    const hasher = new PasswordHasher({
      secretsProvider: makeSecretsProvider("p1"),
    });
    const a = await hasher.hash({ password: "correct horse battery staple" });
    const b = await hasher.hash({ password: "correct horse battery staple" });
    expect(a).not.toBe(b);
  });
  it("verifies a hash with the original password", async () => {
    const hasher = new PasswordHasher({
      secretsProvider: makeSecretsProvider("p1"),
    });
    const hash = await hasher.hash({ password: "abc12345!@#xyz" });
    const ok = await hasher.verify({
      password: "abc12345!@#xyz",
      passwordHash: hash,
    });
    expect(ok).toBe(true);
  });
  it("rejects verification with the wrong password", async () => {
    const hasher = new PasswordHasher({
      secretsProvider: makeSecretsProvider("p1"),
    });
    const hash = await hasher.hash({ password: "abc12345!@#xyz" });
    const ok = await hasher.verify({
      password: "abc12345!@#WRONG",
      passwordHash: hash,
    });
    expect(ok).toBe(false);
  });
  it("rejects verification when the pepper changed", async () => {
    const hashedWithP1 = await new PasswordHasher({
      secretsProvider: makeSecretsProvider("pepper-1"),
    }).hash({ password: "samepassword" });
    const verifierWithP2 = new PasswordHasher({
      secretsProvider: makeSecretsProvider("pepper-2"),
    });
    const ok = await verifierWithP2.verify({
      password: "samepassword",
      passwordHash: hashedWithP1,
    });
    expect(ok).toBe(false);
  });
  it("returns false (not throw) on garbage hashes", async () => {
    const hasher = new PasswordHasher({
      secretsProvider: makeSecretsProvider("p1"),
    });
    const ok = await hasher.verify({
      password: "x",
      passwordHash: "not-a-real-argon2-hash",
    });
    expect(ok).toBe(false);
  });
});
