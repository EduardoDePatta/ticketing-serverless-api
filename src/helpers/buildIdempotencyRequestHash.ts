import { createHash } from "node:crypto";
import { canonicalBodyForHash } from "./canonicalBodyForHash";

export function buildIdempotencyRequestHash(params: {
  method: string;
  path: string;
  body: string;
}): string {
  const { method, path, body } = params;
  const canonicalBody = canonicalBodyForHash(body);
  return createHash("sha256").update(`${method}\n${path}\n${canonicalBody}`).digest("hex");
}
