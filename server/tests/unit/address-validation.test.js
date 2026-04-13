const { orderValidation } = require("../../utills/validation");

describe("orderValidation.validateAddress", () => {
  it("accepts apartment with 1+ chars and trims whitespace", () => {
    expect(orderValidation.validateAddress("  A  ", "apartment")).toBe("A");
    expect(orderValidation.validateAddress(" 12B ", "apartment")).toBe("12B");
  });

  it("rejects empty apartment values after trimming", () => {
    expect(() => orderValidation.validateAddress("", "apartment")).toThrow(
      "apartment is required"
    );
    expect(() => orderValidation.validateAddress("   ", "apartment")).toThrow(
      "apartment must be at least 1 characters"
    );
  });

  it("enforces minimum length 5 for non-apartment fields", () => {
    expect(() => orderValidation.validateAddress("Home", "address")).toThrow(
      "address must be at least 5 characters"
    );
    expect(orderValidation.validateAddress("  Jalan Merdeka 10 ", "address")).toBe(
      "Jalan Merdeka 10"
    );
  });

  it("blocks suspicious address patterns", () => {
    expect(() =>
      orderValidation.validateAddress("<script>alert(1)</script>", "address")
    ).toThrow("address contains invalid characters");
    expect(() =>
      orderValidation.validateAddress("javascript:alert(1)", "address")
    ).toThrow("address contains invalid characters");
  });
});
