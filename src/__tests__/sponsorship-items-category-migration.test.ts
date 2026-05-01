/**
 * sponsorship-items-category-migration.test.ts — Sprint 33 RED phase
 *
 * Pins the contract for the sprint-33 migration file:
 *   supabase/migrations/20260501000001_sponsorship_items_category.sql
 *
 * Strategy: read the migration SQL file and assert the expected DDL/DML
 * statements are present. This validates the migration was written correctly
 * before it runs against any database.
 *
 * RED reason: the migration file does not exist yet. All tests fail with
 * ENOENT / assertion errors until Flux writes the migration in Phase 1.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260501000001_sponsorship_items_category.sql"
);

let migrationSql = "";

beforeAll(() => {
  // Attempt to read the migration. Tests will still run and fail on assertions
  // if the file doesn't exist — that's the RED state.
  try {
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf-8");
  } catch {
    migrationSql = "";
  }
});

describe("Sprint 33 migration — 20260501000001_sponsorship_items_category.sql", () => {
  it("migration file exists at the expected path", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("enum type", () => {
    it("creates sponsorship_category enum type", () => {
      expect(migrationSql).toMatch(
        /CREATE TYPE\s+sponsorship_category\s+AS\s+ENUM\s*\(\s*'sponsorship'\s*,\s*'tribute'\s*,\s*'supporter'\s*\)/i
      );
    });

    it("enum includes all three values: sponsorship, tribute, supporter", () => {
      expect(migrationSql).toContain("'sponsorship'");
      expect(migrationSql).toContain("'tribute'");
      expect(migrationSql).toContain("'supporter'");
    });
  });

  describe("sponsorship_items column additions", () => {
    it("adds category column as NOT NULL with DEFAULT 'sponsorship'", () => {
      // Must be: ADD COLUMN category sponsorship_category NOT NULL DEFAULT 'sponsorship'
      expect(migrationSql).toMatch(
        /ALTER TABLE\s+sponsorship_items\s+ADD COLUMN\s+category\s+sponsorship_category\s+NOT NULL\s+DEFAULT\s+'sponsorship'/i
      );
    });
  });

  describe("sponsorship_purchases column additions", () => {
    it("adds tribute_recipient column as nullable text", () => {
      // ADD COLUMN tribute_recipient text (nullable — no NOT NULL constraint)
      expect(migrationSql).toMatch(
        /ALTER TABLE\s+sponsorship_purchases\s+ADD COLUMN\s+tribute_recipient\s+text/i
      );
    });

    it("tribute_recipient column is NOT declared NOT NULL (must be nullable for non-tribute purchases)", () => {
      // The tribute_recipient line must NOT include NOT NULL
      const tributeColLine = migrationSql
        .split("\n")
        .find((line) => /ADD COLUMN\s+tribute_recipient/i.test(line));
      expect(tributeColLine).toBeDefined();
      expect(tributeColLine).not.toMatch(/NOT NULL/i);
    });
  });

  describe("per-row backfill — Balloons → tribute", () => {
    it("explicitly sets Balloons to category = 'tribute'", () => {
      expect(migrationSql).toMatch(
        /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'tribute'\s+WHERE\s+name\s*=\s*'Balloons'/i
      );
    });
  });

  describe("per-row backfill — Tee Sign + Yard Sign → supporter", () => {
    it("explicitly sets Tee Sign and Yard Sign to category = 'supporter'", () => {
      // Must handle both names in a single UPDATE or two separate UPDATEs
      const hasTeeSign =
        /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'supporter'[^;]*'Tee Sign'/i.test(migrationSql);
      const hasYardSign =
        /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'supporter'[^;]*'Yard Sign'/i.test(migrationSql) ||
        /'Yard Sign'[^;]*UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'supporter'/i.test(migrationSql);

      // At minimum, both names must appear in supporter UPDATE statements
      expect(migrationSql).toContain("Tee Sign");
      expect(migrationSql).toContain("Yard Sign");
      expect(hasTeeSign || migrationSql.match(/'Tee Sign'[\s\S]*?supporter|supporter[\s\S]*?'Tee Sign'/i)).toBeTruthy();
      expect(hasYardSign || migrationSql.match(/'Yard Sign'[\s\S]*?supporter|supporter[\s\S]*?'Yard Sign'/i)).toBeTruthy();
    });

    it("sets supporter for Tee Sign", () => {
      // Either IN ('Tee Sign', 'Yard Sign') or two separate UPDATEs
      const inClause = /WHERE\s+name\s+IN\s*\([^)]*'Tee Sign'[^)]*\)/i.test(migrationSql);
      const separateUpdate = /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'supporter'\s+WHERE\s+name\s*=\s*'Tee Sign'/i.test(migrationSql);
      expect(inClause || separateUpdate).toBe(true);
    });

    it("sets supporter for Yard Sign", () => {
      const inClause = /WHERE\s+name\s+IN\s*\([^)]*'Yard Sign'[^)]*\)/i.test(migrationSql);
      const separateUpdate = /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'supporter'\s+WHERE\s+name\s*=\s*'Yard Sign'/i.test(migrationSql);
      expect(inClause || separateUpdate).toBe(true);
    });
  });

  describe("backfill coverage — sponsorship items not explicitly listed default to 'sponsorship'", () => {
    it("does NOT set Champion, Eagle, or other tier items to tribute or supporter", () => {
      // The migration must not accidentally reclassify tier items.
      // Verify no UPDATE sets category='tribute' for Champion or Eagle.
      const tributeLines = migrationSql
        .split(";")
        .filter((stmt) => /SET\s+category\s*=\s*'tribute'/i.test(stmt));

      for (const line of tributeLines) {
        expect(line).not.toMatch(/Champion|Eagle|Golf Gift|Celebration Lunch|Bloody Mary|Golf Carts|Thursday Night|Wall Sponsor|Morning Biscuit|Shot of the Day/i);
      }
    });

    it("the only tribute item backfilled is Balloons", () => {
      // Count UPDATE statements setting category='tribute'
      const tributeUpdates = migrationSql
        .split(";")
        .filter((stmt) => /UPDATE\s+sponsorship_items\s+SET\s+category\s*=\s*'tribute'/i.test(stmt));

      // All tribute updates must reference 'Balloons' (by name or IN clause)
      for (const stmt of tributeUpdates) {
        expect(stmt).toMatch(/Balloons/);
      }
    });
  });

  describe("sponsorship_items_active view recreation", () => {
    it("drops the existing view before recreating it", () => {
      expect(migrationSql).toMatch(/DROP VIEW\s+(IF EXISTS\s+)?sponsorship_items_active/i);
    });

    it("recreates the view with the category column included", () => {
      expect(migrationSql).toMatch(/CREATE VIEW\s+sponsorship_items_active/i);
      // The new SELECT list must include 'category'
      const createViewBlock = migrationSql.match(
        /CREATE VIEW\s+sponsorship_items_active[\s\S]+?WHERE/i
      );
      expect(createViewBlock).not.toBeNull();
      expect(createViewBlock![0]).toContain("category");
    });

    it("recreated view still includes all original columns (backward compatible)", () => {
      const createViewBlock =
        migrationSql.match(/CREATE VIEW\s+sponsorship_items_active[\s\S]+?WHERE/i)?.[0] ?? "";

      const expectedCols = [
        "id",
        "name",
        "description",
        "price_cents",
        "max_quantity",
        "sold_count",
        "active",
        "year",
        "created_at",
        "benefits",
        "sort_order",
        "deleted_at",
        "deleted_by",
      ];

      for (const col of expectedCols) {
        expect(createViewBlock).toContain(col);
      }
    });
  });

  describe("index creation", () => {
    it("creates an index on sponsorship_items(category)", () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+\w+\s+ON\s+sponsorship_items\s*\(\s*category\s*\)/i
      );
    });
  });
});
