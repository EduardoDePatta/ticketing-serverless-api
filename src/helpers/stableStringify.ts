export function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const t = typeof value;
  if (t === "string") {
    return JSON.stringify(value as string);
  }

  if (t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}
