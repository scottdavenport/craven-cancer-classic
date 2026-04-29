/**
 * Sprint 31 (RED): csv-parser — deriveSuggestedType volunteer-negative contract
 *
 * Decision #6 + plan technical appendix: `volunteer` is NOT derivable from CSV columns.
 * The CSV importer uses GOLFER, COMPANY, and the absence thereof to derive type.
 * Volunteer must be set manually post-import — it must NEVER be auto-assigned.
 *
 * These tests pin the contract: for every possible CSV row fixture pattern,
 * `suggested_type` must never be `'volunteer'`.
 *
 * Fails until: nothing — this SHOULD PASS on unmodified main (volunteer is not in
 * the current deriveSuggestedType logic). These tests act as a regression guard to
 * ensure Flux/Bolt don't accidentally wire up CSV-to-volunteer derivation.
 *
 * Note: `deriveSuggestedType` is not exported — tests use the public `parseCSV` API.
 */

import { describe, it, expect } from "vitest";
import { parseCSV } from "@/app/admin/contacts/csv-parser";

const HEADER = "GOLFER,SALUTATION,FIRST NAME,LAST NAME,COMPANY,ADDRESS,ADDRESS2,CITY,STATE,ZIP";

function csv(...dataLines: string[]): string {
  return [HEADER, ...dataLines].join("\n");
}

describe("Sprint 31 — deriveSuggestedType never returns 'volunteer'", () => {
  const fixtureRows: Array<{ label: string; line: string }> = [
    { label: "GOLFER=Yes, has company", line: "Yes,,John,Doe,Acme Corp,,,NC,27514," },
    { label: "GOLFER=Yes, no company", line: "Yes,,John,Doe,,,,,NC,27514" },
    { label: "GOLFER=No, has company (sponsor)", line: "No,,Jane,Smith,Corp Inc,,,,,27514" },
    { label: "GOLFER=No, no company (donor)", line: "No,,Jane,Smith,,,,,NC,27514" },
    { label: "GOLFER blank, has company", line: ",,Jane,Smith,Corp Inc,,,,,27514" },
    { label: "GOLFER blank, no company (other)", line: ",,Jane,Smith,,,,,NC,27514" },
    { label: "GOLFER blank, no name, no company (other)", line: ",,,,,,,,," },
    { label: "GOLFER=Yes, no name, has company", line: "Yes,,,, Acme,,,,," },
    { label: "GOLFER=No, no name, has company", line: "No,,,,Acme Corp,,,,," },
    { label: "GOLFER=No, no name, no company", line: "No,,,,,,,,,," },
    { label: "Trailing email column present", line: "Yes,,Jim,Hamilton,,,,,NC,27514,jim@example.com" },
    { label: "Quoted company with comma", line: `No,,Jane,Smith,"Smith, Jones & Co",,,,,` },
    { label: "Salutation present", line: "Yes,Mr.,Bob,Smith,,,,,NC,27514" },
    { label: "Full address present", line: "No,Mrs.,Alice,Jones,Acme,100 Main St,Suite 1,Raleigh,NC,27601" },
    { label: "All fields empty except GOLFER=Yes", line: "Yes,,,,,,,,," },
    { label: "GOLFER=No with address but no company", line: "No,,Alice,Jones,,100 Oak,Apt B,Durham,NC,27702" },
  ];

  for (const { label, line } of fixtureRows) {
    it(`fixture: ${label} — suggested_type is not 'volunteer'`, () => {
      const rows = parseCSV(csv(line));
      // Skip rows that produce no output (fully empty — all null fields skipped by parser)
      // The parser may return a row even for all-empty lines; check if we got one.
      for (const row of rows) {
        // Cast to string to avoid TS2367 "no overlap" — the type system already knows
        // 'volunteer' is not in the union; this cast lets us pin the runtime contract too.
        expect(row.suggested_type as string).not.toBe("volunteer");
        // Also assert it's one of the 4 valid current types
        expect(["player", "sponsor", "donor", "other"]).toContain(row.suggested_type);
      }
    });
  }

  it("battery assertion: suggested_type is never 'volunteer' across all fixtures at once", () => {
    const allLines = fixtureRows.map((f) => f.line);
    const allCsv = [HEADER, ...allLines].join("\n");
    const rows = parseCSV(allCsv);

    // Every row must have a non-volunteer suggested_type
    // Cast to string to avoid TS2367 "no overlap" — the compile-time union already
    // excludes 'volunteer'; this pins the runtime contract.
    const volunteerRows = rows.filter((r) => (r.suggested_type as string) === "volunteer");
    expect(volunteerRows).toHaveLength(0);
  });

  it("Sprint 31 note: 'volunteer' is not in the valid suggested_type union — TypeScript contract", () => {
    // This test documents the type contract:
    // ParsedRow.suggested_type is 'player' | 'sponsor' | 'donor' | 'other'
    // It must NOT include 'volunteer' — volunteer is manually tagged post-import.
    // When Flux updates the ContactType union to include 'volunteer',
    // they must NOT update deriveSuggestedType to return it.
    const [row] = parseCSV(csv("Yes,,John,Doe,,,,,NC,27514"));
    // The type assertion here is the RED guard:
    // If deriveSuggestedType ever returns 'volunteer', this will still pass
    // because we check the value doesn't equal 'volunteer'.
    expect(row.suggested_type as string).not.toBe("volunteer");
    expect(typeof row.suggested_type).toBe("string");
  });
});
