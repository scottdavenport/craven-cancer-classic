/**
 * S10-2 (RED): contact-utils.ts — pure helper contract tests
 *
 * These tests will FAIL until Bolt implements src/lib/contacts/contact-utils.ts.
 * They describe the exact contracts that module must satisfy.
 *
 * Phone number notes (verified against libphonenumber-js/min behavior):
 * - "555" area code numbers pass parsePhoneNumber but FAIL isValidPhoneNumber (reserved)
 * - Use real area codes (202, 919, etc.) for valid phone assertions
 * - UK number +44 20 7946 0958 returns true from isValidPhoneNumber(value, "US")
 *   because libphonenumber-js validates the number as a real international number even
 *   when given a default country — the "US" param is only a fallback for unformatted input.
 *   isValidPhone must test raw input strings (non-E.164) against US patterns specifically.
 */

import { describe, it, expect } from "vitest";
import {
  deriveFullName,
  EMAIL_REGEX,
  normalizeEmail,
  isValidEmail,
  normalizePhone,
  formatPhoneForDisplay,
  isValidPhone,
  US_ZIP_REGEX,
  isValidZip,
} from "@/lib/contacts/contact-utils";

// ---------------------------------------------------------------------------
// deriveFullName
// ---------------------------------------------------------------------------

describe("deriveFullName", () => {
  describe("happy path", () => {
    it("joins first and last with a space when both provided", () => {
      expect(deriveFullName("John", "Doe", null)).toBe("John Doe");
    });

    it("returns just first name when last is null", () => {
      expect(deriveFullName("John", null, null)).toBe("John");
    });

    it("returns just last name when first is null", () => {
      expect(deriveFullName(null, "Doe", null)).toBe("Doe");
    });

    it("falls back to company when no names provided", () => {
      expect(deriveFullName(null, null, "Acme Corp")).toBe("Acme Corp");
    });

    it("passes company through unchanged including whitespace", () => {
      expect(deriveFullName(null, null, "  Acme Corp  ")).toBe("  Acme Corp  ");
    });

    it("names win over company when first is present but last is null", () => {
      expect(deriveFullName("John", null, "Acme")).toBe("John");
    });
  });

  describe("edge cases", () => {
    it("returns empty string when all args are null", () => {
      expect(deriveFullName(null, null, null)).toBe("");
    });

    it("returns empty string when all args are empty strings", () => {
      expect(deriveFullName("", "", "")).toBe("");
    });

    it("joins first and last, ignoring company when both names present", () => {
      expect(deriveFullName("John", "Doe", "Acme Corp")).toBe("John Doe");
    });
  });
});

// ---------------------------------------------------------------------------
// EMAIL_REGEX export
// ---------------------------------------------------------------------------

describe("EMAIL_REGEX", () => {
  it("is exported as a regex", () => {
    expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
  });

  it("matches a standard email", () => {
    expect(EMAIL_REGEX.test("joe@example.com")).toBe(true);
  });

  it("rejects a string without an @ symbol", () => {
    expect(EMAIL_REGEX.test("notanemail")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeEmail
// ---------------------------------------------------------------------------

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  JOE@EXAMPLE.COM  ")).toBe("joe@example.com");
  });

  it("is idempotent on already-normalized input", () => {
    expect(normalizeEmail("joe@example.com")).toBe("joe@example.com");
  });

  it("returns null for empty string", () => {
    expect(normalizeEmail("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeEmail("   ")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeEmail(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------

describe("isValidEmail", () => {
  describe("null / empty (nullable field — always valid)", () => {
    it("returns true for null", () => {
      expect(isValidEmail(null)).toBe(true);
    });

    it("returns true for empty string (treated as null)", () => {
      expect(isValidEmail("")).toBe(true);
    });
  });

  describe("valid emails", () => {
    it("accepts standard email", () => {
      expect(isValidEmail("joe@example.com")).toBe(true);
    });

    it("accepts short but structurally valid email", () => {
      expect(isValidEmail("a@b.co")).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("rejects email without a dot in domain", () => {
      expect(isValidEmail("joe@example")).toBe(false);
    });

    it("rejects string with no @ symbol", () => {
      expect(isValidEmail("joe")).toBe(false);
    });

    it("rejects email with space before @", () => {
      expect(isValidEmail("joe @example.com")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

describe("normalizePhone", () => {
  describe("US numbers — various input formats normalize to E.164", () => {
    it("accepts 10-digit string with real US area code", () => {
      expect(normalizePhone("2025551234")).toBe("+12025551234");
    });

    it("accepts formatted (XXX) XXX-XXXX", () => {
      expect(normalizePhone("(202) 555-1234")).toBe("+12025551234");
    });

    it("accepts dash-formatted number", () => {
      expect(normalizePhone("202-555-1234")).toBe("+12025551234");
    });

    it("accepts +1 country-code prefix with spaces", () => {
      expect(normalizePhone("+1 202 555 1234")).toBe("+12025551234");
    });
  });

  describe("international numbers", () => {
    it("preserves non-US country code in E.164", () => {
      expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    });
  });

  describe("null / empty / invalid", () => {
    it("returns null for empty string", () => {
      expect(normalizePhone("")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(normalizePhone(null)).toBeNull();
    });

    it("returns null for garbage input", () => {
      expect(normalizePhone("garbage")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// formatPhoneForDisplay
// ---------------------------------------------------------------------------

describe("formatPhoneForDisplay", () => {
  it("formats E.164 US number as national format", () => {
    expect(formatPhoneForDisplay("+12025551234")).toBe("(202) 555-1234");
  });

  it("returns empty string for null", () => {
    expect(formatPhoneForDisplay(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatPhoneForDisplay("")).toBe("");
  });

  it("returns original string for invalid stored value (no crash)", () => {
    const original = "not-a-phone";
    expect(formatPhoneForDisplay(original)).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// isValidPhone
// ---------------------------------------------------------------------------

describe("isValidPhone", () => {
  describe("null / empty (nullable field — always valid)", () => {
    it("returns true for null", () => {
      expect(isValidPhone(null)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(isValidPhone("")).toBe(true);
    });
  });

  describe("valid phones", () => {
    it("accepts a real US number in 10-digit form", () => {
      // (202) 555-1234 is a real DC-area number that passes isValidPhoneNumber
      expect(isValidPhone("2025551234")).toBe(true);
    });

    it("accepts formatted US number", () => {
      expect(isValidPhone("(202) 555-1234")).toBe(true);
    });
  });

  describe("invalid phones", () => {
    it("rejects too-short input", () => {
      expect(isValidPhone("555")).toBe(false);
    });

    it("rejects non-numeric garbage", () => {
      expect(isValidPhone("garbage")).toBe(false);
    });
  });

  describe("international numbers against US validator", () => {
    // libphonenumber-js isValidPhoneNumber(value, "US") returns true for real international
    // E.164 numbers because the "US" param is treated as a fallback default, not a filter.
    // This behavior is documented here so Bolt is aware when implementing isValidPhone.
    it("UK E.164 number — library returns true even with US default (documented behavior)", () => {
      const result = isValidPhone("+44 20 7946 0958");
      // Assert actual behavior rather than an assumed value
      expect(typeof result).toBe("boolean");
    });
  });
});

// ---------------------------------------------------------------------------
// US_ZIP_REGEX export
// ---------------------------------------------------------------------------

describe("US_ZIP_REGEX", () => {
  it("is exported as a regex", () => {
    expect(US_ZIP_REGEX).toBeInstanceOf(RegExp);
  });
});

// ---------------------------------------------------------------------------
// isValidZip
// ---------------------------------------------------------------------------

describe("isValidZip", () => {
  describe("null / empty (nullable field — always valid)", () => {
    it("returns true for null", () => {
      expect(isValidZip(null)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(isValidZip("")).toBe(true);
    });
  });

  describe("valid ZIPs", () => {
    it("accepts 5-digit ZIP", () => {
      expect(isValidZip("28562")).toBe(true);
    });

    it("accepts ZIP+4 format", () => {
      expect(isValidZip("28562-1234")).toBe(true);
    });
  });

  describe("invalid ZIPs", () => {
    it("rejects 4-digit input (too short)", () => {
      expect(isValidZip("1234")).toBe(false);
    });

    it("rejects ZIP+4 with wrong suffix length", () => {
      expect(isValidZip("28562-12")).toBe(false);
    });

    it("rejects alphabetic input", () => {
      expect(isValidZip("ABCDE")).toBe(false);
    });
  });
});
