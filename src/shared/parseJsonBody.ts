export type ParseJsonBodyResult =
  | {
      ok: true;
      value: Record<string, unknown>;
    }
  | {
      ok: false;
      reason: "invalid_json" | "not_object";
    };
export function parseJsonBody(params: { rawBody: string | undefined | null }): ParseJsonBodyResult {
  const raw = params.rawBody;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: {} };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, reason: "not_object" };
  }

  return { ok: true, value: value as Record<string, unknown> };
}
