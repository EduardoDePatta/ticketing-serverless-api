import {
    decodeRefreshToken,
    encodeRefreshToken,
    generateRefreshTokenSecret,
    hashRefreshTokenSecret,
} from "../../../src/shared/auth/refreshTokenCodec";


describe("refreshTokenCodec", () => {
    describe("encode/decode", () => {
        it("round trips id and secret", () => {
            const token = encodeRefreshToken({
                id: "id-1",
                secret: "secret-abc",
            });
            const decoded = decodeRefreshToken({ token });
            expect(decoded.ok).toBe(true);
            if (decoded.ok) {
                expect(decoded.id).toBe("id-1");
                expect(decoded.secret).toBe("secret-abc");
            }
        });

        it("returns ok=false for tokens without exactly one separator", () => {
            expect(decodeRefreshToken({ token: "no-dot" }).ok).toBe(false);
            expect(decodeRefreshToken({ token: "a.b.c" }).ok).toBe(false);
            expect(decodeRefreshToken({ token: "" }).ok).toBe(false);
        });

        it("returns ok=false for empty halves", () => {
            expect(decodeRefreshToken({ token: ".secret" }).ok).toBe(false);
            expect(decodeRefreshToken({ token: "id." }).ok).toBe(false);
        });
    });

    describe("generateRefreshTokenSecret", () => {
        it("returns a base64url string of at least 32 bytes worth (>= 43 chars)", () => {
            const s = generateRefreshTokenSecret();
            expect(typeof s).toBe("string");
            expect(s.length).toBeGreaterThanOrEqual(43);
            expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it("returns different values across calls", () => {
            const a = generateRefreshTokenSecret();
            const b = generateRefreshTokenSecret();
            expect(a).not.toBe(b);
        });
    });

    describe("hashRefreshTokenSecret", () => {
        it("is deterministic for the same input", () => {
            const a = hashRefreshTokenSecret({ secret: "abc" });
            const b = hashRefreshTokenSecret({ secret: "abc" });
            expect(a).toBe(b);
        });

        it("differs across inputs", () => {
            expect(hashRefreshTokenSecret({ secret: "a" })).not.toBe(
                hashRefreshTokenSecret({ secret: "b" })
            );
        });

        it("returns a 64-char lowercase hex digest (sha256)", () => {
            const h = hashRefreshTokenSecret({ secret: "abc" });
            expect(h).toMatch(/^[0-9a-f]{64}$/);
        });
    });
});
