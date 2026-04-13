import { isValidEmailAddressFormat } from "@/lib/utils";

describe("isValidEmailAddressFormat", () => {
    it("should return true for a valid email and false for invalid formats", () => {
        expect(isValidEmailAddressFormat("user@example.com")).toBe(true);
        expect(isValidEmailAddressFormat("invalid-email")).toBe(false);
        expect(isValidEmailAddressFormat("user@domain")).toBe(false);
    });
});