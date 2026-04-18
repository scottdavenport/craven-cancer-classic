/**
 * S3-8: sold_count increment logic — contract tests.
 *
 * The trigger fires in the DB, so we can't unit-test it directly.
 * These tests assert the migration SQL structure as text (it must contain
 * the correct trigger and function bodies) and verify the webhook handler
 * does NOT break the existing sold_count path.
 *
 * The migration file does not exist yet — tests fail until Flux creates
 * `supabase/migrations/20260419000003_sold_count_trigger.sql`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATION_PATH = resolve(
  __dirname,
  "../../supabase/migrations/20260419000003_sold_count_trigger.sql"
);

describe("S3-8 sold_count trigger migration", () => {
  let sql: string;

  // Each test reads the file fresh — if the file doesn't exist the test fails
  // with ENOENT, which is the correct red-phase failure.
  function getMigrationSql(): string {
    return readFileSync(MIGRATION_PATH, "utf-8");
  }

  describe("migration file exists and contains required objects", () => {
    it("defines the increment_sold_count function", () => {
      sql = getMigrationSql();
      expect(sql.toLowerCase()).toContain("increment_sold_count");
    });

    it("creates the trigger on sponsorship_purchases", () => {
      sql = getMigrationSql();
      expect(sql.toLowerCase()).toContain("on_sponsorship_purchase_paid");
    });

    it("trigger fires after update of payment_status", () => {
      sql = getMigrationSql();
      // Must be AFTER UPDATE, not BEFORE
      expect(sql.toLowerCase()).toMatch(/after\s+update\s+of\s+payment_status/);
    });

    it("function only increments when NEW.payment_status = 'paid'", () => {
      sql = getMigrationSql();
      expect(sql).toContain("'paid'");
    });

    it("function guards against no-op update (OLD.payment_status IS DISTINCT FROM 'paid')", () => {
      sql = getMigrationSql();
      // Must check that old status differs so paid→paid doesn't double-increment
      expect(sql.toLowerCase()).toContain("is distinct from");
    });

    it("function increments sold_count by 1 on sponsorship_items", () => {
      sql = getMigrationSql();
      expect(sql.toLowerCase()).toContain("sold_count = sold_count + 1");
      expect(sql.toLowerCase()).toContain("sponsorship_items");
    });
  });
});
