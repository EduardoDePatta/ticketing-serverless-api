import { createHash } from "node:crypto";

export function legacyRawBodyRequestHash(params: {
  method: string;
  path: string;
  body: string;
}): string {
  const { method, path, body } = params;
  return createHash("sha256").update(`${method}\n${path}\n${body}`).digest("hex");
}
