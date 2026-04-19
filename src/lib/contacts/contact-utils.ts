import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js/min";

export function deriveFullName(
  first: string | null,
  last: string | null,
  company: string | null
): string {
  const parts = [first, last].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return company ?? "";
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string | null): string | null {
  const trimmed = (raw ?? "").trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidEmail(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  return EMAIL_REGEX.test(raw.trim());
}

export function normalizePhone(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = parsePhoneNumber(raw.trim(), "US");
    return parsed?.number ?? null;
  } catch (_err) {
    return null;
  }
}

export function formatPhoneForDisplay(stored: string | null): string {
  if (!stored) return "";
  try {
    return parsePhoneNumber(stored).formatNational();
  } catch (_err) {
    return stored;
  }
}

export function isValidPhone(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  return isValidPhoneNumber(raw.trim(), "US");
}

export const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export function isValidZip(raw: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  return US_ZIP_REGEX.test(raw.trim());
}
