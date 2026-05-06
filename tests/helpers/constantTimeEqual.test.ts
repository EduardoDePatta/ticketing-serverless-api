import { constantTimeEqual } from "../../src/helpers/constantTimeEqual";

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual({ a: "abc", b: "abc" })).toBe(true);
  });
  it("returns false when lengths differ", () => {
    expect(constantTimeEqual({ a: "ab", b: "abc" })).toBe(false);
  });
  it("returns false when same length but different content", () => {
    expect(constantTimeEqual({ a: "abd", b: "abc" })).toBe(false);
  });
});
