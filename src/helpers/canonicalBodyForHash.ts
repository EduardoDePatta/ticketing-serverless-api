import { stableStringify } from "./stableStringify";

export function canonicalBodyForHash(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") {
    return "";
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === "object") {
      return stableStringify(parsed);
    }

    return JSON.stringify(parsed as string | number | boolean | null);
  } catch {
    return body;
  }
}
