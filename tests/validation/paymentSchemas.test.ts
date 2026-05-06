import {
  billingAddressSchema,
  cardSchema,
  isLuhnValid,
  normalizeCardNumber,
  payOrderInputSchema,
} from "../../src/validation/payment";

const validCard = {
  number: "4242 4242 4242 4242",
  holderName: "Alice Doe",
  expiryMonth: 12,
  expiryYear: 2030,
  cvv: "123",
};
const validAddress = {
  line1: "Rua Augusta 100",
  city: "Lisboa",
  state: "Lisboa",
  postalCode: "1100-053",
  country: "PT",
};
describe("isLuhnValid", () => {
  it("accepts a known good card (4242 ...)", () => {
    expect(isLuhnValid("4242424242424242")).toBe(true);
  });
  it("rejects a number that fails the checksum", () => {
    expect(isLuhnValid("4242424242424243")).toBe(false);
  });
  it("rejects non-digit input", () => {
    expect(isLuhnValid("4242-4242")).toBe(false);
  });
});
describe("normalizeCardNumber", () => {
  it("strips whitespace and dashes", () => {
    expect(normalizeCardNumber("4242-4242 4242 4242")).toBe("4242424242424242");
  });
});
describe("cardSchema", () => {
  it("accepts a valid card and normalizes the number", () => {
    const r = cardSchema.safeParse(validCard);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.number).toBe("4242424242424242");
    }
  });
  it("rejects a number that fails Luhn", () => {
    const r = cardSchema.safeParse({
      ...validCard,
      number: "4242 4242 4242 4243",
    });
    expect(r.success).toBe(false);
  });
  it("rejects an expired card", () => {
    const r = cardSchema.safeParse({
      ...validCard,
      expiryYear: 2000,
      expiryMonth: 1,
    });
    expect(r.success).toBe(false);
  });
  it("rejects bad CVV", () => {
    const r = cardSchema.safeParse({ ...validCard, cvv: "12" });
    expect(r.success).toBe(false);
  });
  it("rejects too-short numbers", () => {
    const r = cardSchema.safeParse({ ...validCard, number: "4242" });
    expect(r.success).toBe(false);
  });
});
describe("billingAddressSchema", () => {
  it("accepts a valid address and uppercases the country", () => {
    const r = billingAddressSchema.safeParse({
      ...validAddress,
      country: "pt",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.country).toBe("PT");
    }
  });
  it("rejects bad country code", () => {
    const r = billingAddressSchema.safeParse({
      ...validAddress,
      country: "Portugal",
    });
    expect(r.success).toBe(false);
  });
  it("rejects empty line1", () => {
    const r = billingAddressSchema.safeParse({
      ...validAddress,
      line1: " ",
    });
    expect(r.success).toBe(false);
  });
});
describe("payOrderInputSchema", () => {
  it("accepts a complete valid input", () => {
    const r = payOrderInputSchema.safeParse({
      card: validCard,
      billingAddress: validAddress,
    });
    expect(r.success).toBe(true);
  });
  it("rejects unknown root fields", () => {
    const r = payOrderInputSchema.safeParse({
      card: validCard,
      billingAddress: validAddress,
      extra: "x",
    });
    expect(r.success).toBe(false);
  });
});
