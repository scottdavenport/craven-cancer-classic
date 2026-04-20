/**
 * S15-B (RED): sponsors/actions.ts — server action contract tests.
 *
 * These tests FAIL until Bolt implements:
 * - createSponsor / updateSponsor: normalizeEmail, normalizePhone, isValidEmail,
 *   isValidPhone guards with {error} return on invalid input.
 * - uploadSponsorLogo: 5MB cap, SVG <script> sanitization, old-file removal.
 *
 * Issues: #150 (phone + email normalize/validate), #153 (sponsor logo upload UI)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ role: "admin" }),
}));

import * as serverModule from "@/lib/supabase/server";
import {
  createSponsor,
  updateSponsor,
  uploadSponsorLogo,
} from "@/app/admin/sponsors/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setClient(client: unknown) {
  vi.mocked(serverModule.createClient).mockResolvedValue(
    client as Awaited<ReturnType<typeof serverModule.createClient>>
  );
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

function makeFileFormData(file: File, extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("file", file);
  for (const [key, value] of Object.entries(extra)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
});

// ---------------------------------------------------------------------------
// createSponsor
// ---------------------------------------------------------------------------

describe("createSponsor", () => {
  it("normalizes email: stores lowercased + trimmed value", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    const fd = makeFormData({
      name: "Acme Corp",
      tier_id: "tier-uuid",
      contact_email: "  JANE@example.com  ",
      contact_phone: "",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await createSponsor(fd);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.contact_email).toBe("jane@example.com");
  });

  it("normalizes phone: stores E.164 format", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    const fd = makeFormData({
      name: "Phone Corp",
      tier_id: "tier-uuid",
      contact_email: "",
      contact_phone: "(555) 123-4567",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await createSponsor(fd);

    expect(result).toEqual({ success: true });
    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.contact_phone).toBe("+15551234567");
  });

  it("invalid email returns {error} and does NOT call insert", async () => {
    const mockInsert = vi.fn();
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    const fd = makeFormData({
      name: "Bad Email Corp",
      tier_id: "tier-uuid",
      contact_email: "not-an-email",
      contact_phone: "",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await createSponsor(fd);

    expect((result as { error: string }).error).toMatch(/invalid email/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid phone returns {error} and does NOT call insert", async () => {
    const mockInsert = vi.fn();
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    const fd = makeFormData({
      name: "Bad Phone Corp",
      tier_id: "tier-uuid",
      contact_email: "",
      contact_phone: "123",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await createSponsor(fd);

    expect((result as { error: string }).error).toMatch(/invalid phone/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("empty contact_email and empty contact_phone inserts both as null", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    const fd = makeFormData({
      name: "Null Fields Corp",
      tier_id: "tier-uuid",
      contact_email: "",
      contact_phone: "",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await createSponsor(fd);

    expect(result).toEqual({ success: true });
    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.contact_email).toBeNull();
    expect(insertArg.contact_phone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateSponsor
// ---------------------------------------------------------------------------

describe("updateSponsor", () => {
  it("happy path: normalizes email and stores correctly", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    setClient({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    });

    const fd = makeFormData({
      name: "Updated Corp",
      tier_id: "tier-uuid",
      contact_email: "  UPDATED@example.com  ",
      contact_phone: "",
      payment_status: "paid",
      amount_paid: "500",
    });
    const result = await updateSponsor("sponsor-uuid", fd);

    expect(result).toEqual({ success: true });
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.contact_email).toBe("updated@example.com");
  });

  it("invalid email returns {error} and does NOT call update", async () => {
    const mockUpdate = vi.fn();
    setClient({
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    });

    const fd = makeFormData({
      name: "Bad Email Update Corp",
      tier_id: "tier-uuid",
      contact_email: "bad-email-format",
      contact_phone: "",
      payment_status: "pending",
      amount_paid: "0",
    });
    const result = await updateSponsor("sponsor-uuid", fd);

    expect((result as { error: string }).error).toMatch(/invalid email/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// uploadSponsorLogo
// ---------------------------------------------------------------------------

describe("uploadSponsorLogo", () => {
  it("file >5MB returns {error} and does NOT call Storage upload", async () => {
    const mockUpload = vi.fn();
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      remove: vi.fn(),
    });
    setClient({
      storage: { from: mockStorageFrom },
    });

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    const fd = makeFileFormData(bigFile);
    const result = await uploadSponsorLogo(fd);

    expect((result as { error: string }).error).toMatch(/too large|5mb/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("SVG with <script> tag: Storage upload receives sanitized content without <script>", async () => {
    const svgWithScript = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('x')</script><rect width="100" height="100"/></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({
      storage: { from: mockStorageFrom },
    });

    const svgFile = new File([svgWithScript], "logo.svg", {
      type: "image/svg+xml",
    });
    const fd = makeFileFormData(svgFile);
    const result = await uploadSponsorLogo(fd);

    // Should succeed
    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    // Inspect the uploaded file argument — must be script-free
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    let uploadedText: string;
    if (uploadedFile instanceof Blob) {
      uploadedText = await uploadedFile.text();
    } else {
      uploadedText = String(uploadedFile);
    }
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("alert('x')");
  });

  it("SVG with self-closing <script src=.../> tag: script attribute is stripped", async () => {
    const svgWithSelfClose = `<svg xmlns="http://www.w3.org/2000/svg"><script src="http://evil.com/x.js"/><rect width="100" height="100"/></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({
      storage: { from: mockStorageFrom },
    });

    const svgFile = new File([svgWithSelfClose], "logo.svg", { type: "image/svg+xml" });
    const fd = makeFileFormData(svgFile);
    const result = await uploadSponsorLogo(fd);

    expect((result as { url: string }).url).toBeTruthy();
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("evil.com");
  });

  it("SVG with on* event handler attribute: onclick removed, <rect> preserved", async () => {
    const svgWithOnClick = `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="100" height="100"/></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({
      storage: { from: mockStorageFrom },
    });

    const svgFile = new File([svgWithOnClick], "logo.svg", { type: "image/svg+xml" });
    const fd = makeFileFormData(svgFile);
    const result = await uploadSponsorLogo(fd);

    expect((result as { url: string }).url).toBeTruthy();
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/onclick/i);
    expect(uploadedText).not.toContain("alert(1)");
    expect(uploadedText).toContain("<rect");
  });

  it("when oldLogoUrl provided, Storage .remove() is called before upload", async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/new.png" } }),
    });
    setClient({
      storage: { from: mockStorageFrom },
    });

    const newFile = new File(["png-content"], "new-logo.png", {
      type: "image/png",
    });
    const fd = makeFileFormData(newFile, {
      oldLogoUrl: "https://example.com/logos/old-logo-123.png",
    });
    const result = await uploadSponsorLogo(fd);

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockRemove).toHaveBeenCalledTimes(1);
    // remove should be called before upload — verify call order
    const removeOrder = mockRemove.mock.invocationCallOrder[0];
    const uploadOrder = mockUpload.mock.invocationCallOrder[0];
    expect(removeOrder).toBeLessThan(uploadOrder);
  });
});
