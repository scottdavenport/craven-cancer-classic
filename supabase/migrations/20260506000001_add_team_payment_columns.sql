-- Migration: add payment capture columns to teams
-- Prerequisite for F-T8 (P1) — Mark Paid captures payment method, reference, and date.
-- Sprint: 2026-05-admin-table-unification PR-3-teams

ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_method text NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS payment_reference text NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;
