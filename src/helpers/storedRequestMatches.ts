import { legacyRawBodyRequestHash } from "./legacyRawBodyRequestHash";

export function storedRequestMatches(params: {
  storedHash: string;
  method: string;
  path: string;
  body: string;
  primaryHash: string;
}): boolean {
  const { storedHash, method, path, body, primaryHash } = params;
  if (storedHash === primaryHash) {
    return true;
  }

  const legacyHash = legacyRawBodyRequestHash({ method, path, body });
  return storedHash === legacyHash;
}
