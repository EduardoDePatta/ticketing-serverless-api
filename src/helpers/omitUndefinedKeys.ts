export function omitUndefinedKeys<T extends Record<string, unknown>>(params: {
  obj: T;
}): Partial<T> {
  const { obj } = params;
  return Object.fromEntries(
    Object.entries(obj).filter((entry) => entry[1] !== undefined)
  ) as Partial<T>;
}
