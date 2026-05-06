import { createEventInputSchema } from "../../src/validation/event/createEventInputSchema";
import { eventIdParamSchema } from "../../src/validation/event/eventIdParamSchema";
import { updateEventInputSchema } from "../../src/validation/event/updateEventInputSchema";

const validCreate = {
  name: "Concert",
  date: "2026-06-15T20:00:00.000Z",
  location: "Lisboa",
  priceInCents: 2500,
  availableTickets: 100,
};
describe("createEventInputSchema", () => {
  it("accepts minimal valid input and applies defaults via output", () => {
    const result = createEventInputSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Concert");
      expect(result.data.currency).toBeUndefined();
    }
  });
  it("trims name and coerces description empty to undefined", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      name: "  Trimmed  ",
      description: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Trimmed");
      expect(result.data.description).toBeUndefined();
    }
  });
  it("rejects empty name", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      name: "   ",
    });
    expect(result.success).toBe(false);
  });
  it("rejects non-positive priceInCents", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      priceInCents: 0,
    });
    expect(result.success).toBe(false);
  });
  it("rejects negative availableTickets", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      availableTickets: -1,
    });
    expect(result.success).toBe(false);
  });
  it("rejects empty currency when provided", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      currency: "  ",
    });
    expect(result.success).toBe(false);
  });
  it("rejects unknown keys (strict)", () => {
    const result = createEventInputSchema.safeParse({
      ...validCreate,
      extraField: true,
    });
    expect(result.success).toBe(false);
  });
});
describe("updateEventInputSchema", () => {
  it("accepts empty partial object", () => {
    const result = updateEventInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
  it("accepts partial name update", () => {
    const result = updateEventInputSchema.safeParse({
      name: "New name",
    });
    expect(result.success).toBe(true);
  });
  it("rejects empty name when provided", () => {
    const result = updateEventInputSchema.safeParse({ name: "  " });
    expect(result.success).toBe(false);
  });
  it("accepts status enum", () => {
    const result = updateEventInputSchema.safeParse({
      status: "CANCELLED",
    });
    expect(result.success).toBe(true);
  });
});
describe("eventIdParamSchema", () => {
  it("accepts non-empty id", () => {
    expect(eventIdParamSchema.safeParse("abc-uuid").success).toBe(true);
  });
  it("rejects blank id", () => {
    expect(eventIdParamSchema.safeParse("   ").success).toBe(false);
  });
});
