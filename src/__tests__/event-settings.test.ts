// Runs in UTC; explicit timeZone: 'UTC' in helper is required for consistent output across runner timezones.
import { describe, it, expect } from "vitest";
import { formatTournamentDate } from "@/lib/event-settings";

describe("formatTournamentDate", () => {
  it('returns "Date TBD" when start is null', () => {
    expect(formatTournamentDate(null, null)).toBe("Date TBD");
  });

  it("formats a single date with no end date", () => {
    expect(formatTournamentDate("2026-09-18", null)).toBe("September 18, 2026");
  });

  it("formats as single day when start and end are the same date", () => {
    expect(formatTournamentDate("2026-09-18", "2026-09-18")).toBe(
      "September 18, 2026"
    );
  });

  it("formats same-month range with en-dash", () => {
    expect(formatTournamentDate("2026-09-18", "2026-09-19")).toBe(
      "September 18–19, 2026"
    );
  });

  it("formats cross-month range with spaced en-dash", () => {
    expect(formatTournamentDate("2026-08-31", "2026-09-01")).toBe(
      "August 31 – September 1, 2026"
    );
  });

  it('returns "Date TBD" for invalid date strings without crashing', () => {
    expect(formatTournamentDate("invalid", "bad")).toBe("Date TBD");
  });
});
