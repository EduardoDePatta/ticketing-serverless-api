import { createHash, randomBytes } from "node:crypto";
const SEPARATOR = ".";
export type DecodeRefreshTokenResult = {
    ok: true;
    id: string;
    secret: string;
} | {
    ok: false;
};
export function encodeRefreshToken(params: {
    id: string;
    secret: string;
}): string {
    return `${params.id}${SEPARATOR}${params.secret}`;
}
export function decodeRefreshToken(params: {
    token: string;
}): DecodeRefreshTokenResult {
    const parts = params.token.split(SEPARATOR);
    if (parts.length !== 2) {
        return { ok: false };
    }
    const [id, secret] = parts;
    if (!id || !secret) {
        return { ok: false };
    }
    return { ok: true, id, secret };
}
export function generateRefreshTokenSecret(): string {
    return randomBytes(32).toString("base64url");
}
export function hashRefreshTokenSecret(params: {
    secret: string;
}): string {
    return createHash("sha256").update(params.secret).digest("hex");
}
