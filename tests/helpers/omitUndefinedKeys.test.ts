import { omitUndefinedKeys } from "../../src/helpers/omitUndefinedKeys";

describe("omitUndefinedKeys", () => {
  it("drops keys whose values are undefined", () => {
    const out = omitUndefinedKeys({
      obj: { a: 1, b: undefined, c: "x" },
    });
    expect(out).toEqual({ a: 1, c: "x" });
    expect(Object.prototype.hasOwnProperty.call(out, "b")).toBe(false);
  });
  it("keeps null values", () => {
    const out = omitUndefinedKeys({
      obj: { n: null },
    });
    expect(out).toEqual({ n: null });
  });
});
