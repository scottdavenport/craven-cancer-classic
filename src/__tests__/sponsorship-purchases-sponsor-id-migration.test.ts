/**
 * Migration test — supabase/migrations/20260509000001_sponsorship_purchases_sponsor_id.sql
 *
 * Pins the contract for issue #380: add sponsor_id FK to sponsorship_purchases
 * with ON DELETE SET NULL and a partial index excluding NULLs.
 *
 * Strategy: read the migration SQL file and assert the expected DDL is present.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260509000001_sponsorship_purchases_sponsor_id.sql"
);

let migrationSql = "";

beforeAll(() => {
  try {
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf-8");
  } catch {
    migrationSql = "";
  }
});

describe("Migration 20260509000001 — sponsorship_purchases.sponsor_id FK", () => {
  it("migration file exists at the expected path", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe("sponsor_id column", () => {
    it("adds sponsor_id column as nullable UUID", () => {
      expect(migrationSql).toMatch(
        /ALTER TABLE\s+sponsorship_purchases\s+ADD COLUMN\s+sponsor_id\s+UUID/i
      );
    });

    it("does NOT declare sponsor_id as NOT NULL", () => {
      const sponsorIdLine = migrationSql
        .split("\n")
        .find((line) => /ADD COLUMN\s+sponsor_id/i.test(line));
      expect(sponsorIdLine).toBeDefined();
      expect(sponsorIdLine).not.toMatch(/NOT NULL/i);
    });

    it("references sponsors(id) with ON DELETE SET NULL", () => {
      expect(migrationSql).toMatch(
        /REFERENCES\s+sponsors\s*\(\s*id\s*\)\s+ON DELETE\s+SET NULL/i
      );
    });
  });

  describe("partial index", () => {
    it("creates idx_sponsorship_purchases_sponsor_id index", () => {
      expect(migrationSql).toMatch(
        /CREATE INDEX\s+idx_sponsorship_purchases_sponsor_id\s+ON\s+sponsorship_purchases\s*\(\s*sponsor_id\s*\)/i
      );
    });

    it("index has WHERE sponsor_id IS NOT NULL predicate (partial index)", () => {
      expect(migrationSql).toMatch(/WHERE\s+sponsor_id\s+IS NOT NULL/i);
    });
  });
});
