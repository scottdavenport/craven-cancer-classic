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
import * as adminModule from "@/lib/supabase/admin";
import {
  createSponsor,
  updateSponsor,
  uploadSponsorLogo,
  getSponsors,
  getSponsorContacts,
  linkSponsorContact,
  unlinkSponsorContact,
} from "@/app/admin/sponsors/actions";

// Cast new functions to callable — they don't exist yet (RED phase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _getSponsorContacts = getSponsorContacts as (...args: any[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _linkSponsorContact = linkSponsorContact as (...args: any[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _unlinkSponsorContact = unlinkSponsorContact as (...args: any[]) => Promise<any>;

// getSponsors currently takes no args — cast to accept optional filter args (RED phase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _getSponsors = getSponsors as (opts?: { year?: number; is_active?: boolean }) => Promise<any[]>;

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

// deprecated: PR B removes contact_name/email/phone fields from createSponsor and updateSponsor;
// the old S15 "createSponsor" and "updateSponsor" describe blocks asserting those fields
// are normalized and stored have been removed. They are replaced by the S18-B describe blocks
// below which assert those fields are NOT written to the DB.

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

  it("SVG with <foreignObject>: foreignObject element stripped", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="http://evil.com"></iframe></foreignObject><rect width="100" height="100"/></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({ storage: { from: mockStorageFrom } });

    const svgFile = new File([svg], "logo.svg", { type: "image/svg+xml" });
    const result = await uploadSponsorLogo(makeFileFormData(svgFile));

    expect((result as { url: string }).url).toBeTruthy();
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/foreignobject/i);
    expect(uploadedText).not.toMatch(/iframe/i);
    expect(uploadedText).not.toContain("evil.com");
    expect(uploadedText).toContain("<rect");
  });

  it("SVG with <a href='javascript:...'>: javascript: href stripped, element preserved or link defanged", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="100" height="100"/></a></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({ storage: { from: mockStorageFrom } });

    const svgFile = new File([svg], "logo.svg", { type: "image/svg+xml" });
    const result = await uploadSponsorLogo(makeFileFormData(svgFile));

    expect((result as { url: string }).url).toBeTruthy();
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/javascript:/i);
    expect(uploadedText).not.toContain("alert(1)");
  });

  it("SVG with <use xlink:href='data:...'>: external reference stripped", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil.com/payload.svg#x"/><rect width="100" height="100"/></svg>`;
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/logos/test.svg" } }),
      remove: vi.fn(),
    });
    setClient({ storage: { from: mockStorageFrom } });

    const svgFile = new File([svg], "logo.svg", { type: "image/svg+xml" });
    const result = await uploadSponsorLogo(makeFileFormData(svgFile));

    expect((result as { url: string }).url).toBeTruthy();
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/xlink:href/i);
    expect(uploadedText).not.toContain("evil.com");
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

// ---------------------------------------------------------------------------
// uploadSponsorLogo — MIME-spoof defense (#188)
// ---------------------------------------------------------------------------
// These tests encode the RED-phase contract for content-sniff SVG detection.
// All 5 tests FAIL until Bolt implements content-sniff in sanitizeSvgIfNeeded:
//   if (file.type !== "image/svg+xml") return file;   ← current (MIME-only gate)
//   → replace with: sniff first 1KB bytes for SVG markers, sanitize if found.
// ---------------------------------------------------------------------------

describe("uploadSponsorLogo — MIME-spoof defense (#188)", () => {
  // Helper: builds mock storage client with a capturable upload spy
  function makeStorageMock() {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: mockUpload,
      remove: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/logos/test.svg" },
      }),
    });
    setClient({ storage: { from: mockStorageFrom } });
    return mockUpload;
  }

  it("SVG content + image/png MIME: sanitized (script stripped) and uploaded as svg+xml", async () => {
    // A malicious SVG disguised as a PNG — must be sniffed by content, not MIME.
    const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="100" height="100"/></svg>`;
    const mockUpload = makeStorageMock();

    const spoofedFile = new File([svgPayload], "logo.png", { type: "image/png" });
    const result = await uploadSponsorLogo(makeFileFormData(spoofedFile));

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    // Uploaded blob must be script-free
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("alert(1)");

    // MIME type should be corrected to svg+xml after content-sniff
    if (uploadedFile instanceof File) {
      expect(uploadedFile.type).toBe("image/svg+xml");
    }
  });

  it("SVG content + application/octet-stream MIME: sanitized (script stripped)", async () => {
    // Same attack vector, different MIME disguise.
    const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg"><script>steal(document.cookie)</script><circle r="50"/></svg>`;
    const mockUpload = makeStorageMock();

    const spoofedFile = new File([svgPayload], "logo.bin", {
      type: "application/octet-stream",
    });
    const result = await uploadSponsorLogo(makeFileFormData(spoofedFile));

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("steal(");

    if (uploadedFile instanceof File) {
      expect(uploadedFile.type).toBe("image/svg+xml");
    }
  });

  it("XML-prolog SVG + image/png MIME: sanitized (script stripped)", async () => {
    // SVGs often start with an XML declaration before <svg>. Content sniff must handle this.
    const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script><rect width="50" height="50"/></svg>`;
    const mockUpload = makeStorageMock();

    const spoofedFile = new File([svgPayload], "logo.png", { type: "image/png" });
    const result = await uploadSponsorLogo(makeFileFormData(spoofedFile));

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("evil()");

    if (uploadedFile instanceof File) {
      expect(uploadedFile.type).toBe("image/svg+xml");
    }
  });

  it("real PNG bytes + image/png MIME: passes through byte-identical (not sanitized)", async () => {
    // PNG magic bytes: \x89PNG\r\n\x1a\n — real image, must not be mangled.
    // Using a minimal 8-byte PNG magic header + some padding bytes.
    const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngPadding = new Uint8Array(20).fill(0xff); // 20 bytes of binary-like data
    const pngBytes = new Uint8Array(pngMagic.length + pngPadding.length);
    pngBytes.set(pngMagic, 0);
    pngBytes.set(pngPadding, pngMagic.length);

    const mockUpload = makeStorageMock();

    const realPng = new File([pngBytes], "logo.png", { type: "image/png" });
    const result = await uploadSponsorLogo(makeFileFormData(realPng));

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    // Byte length must be preserved unchanged (no sanitization transformation)
    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedByteLength =
      uploadedFile instanceof Blob ? uploadedFile.size : String(uploadedFile).length;
    expect(uploadedByteLength).toBe(pngBytes.byteLength);

    // First 8 bytes must still be the PNG magic header
    if (uploadedFile instanceof Blob) {
      const uploadedBuf = await uploadedFile.arrayBuffer();
      const uploadedBytes = new Uint8Array(uploadedBuf);
      pngMagic.forEach((byte, i) => {
        expect(uploadedBytes[i]).toBe(byte);
      });
    }
  });

  it("legitimate image/svg+xml file with <script>: still sanitized (regression guard)", async () => {
    // Ensure the existing MIME-based path isn't accidentally broken by the content-sniff refactor.
    const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg"><script>xss()</script><rect width="100" height="100"/></svg>`;
    const mockUpload = makeStorageMock();

    const svgFile = new File([svgPayload], "logo.svg", { type: "image/svg+xml" });
    const result = await uploadSponsorLogo(makeFileFormData(svgFile));

    expect((result as { url: string }).url).toBeTruthy();
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const uploadedFile = mockUpload.mock.calls[0][1] as File | Blob | string;
    const uploadedText = uploadedFile instanceof Blob ? await uploadedFile.text() : String(uploadedFile);
    expect(uploadedText).not.toMatch(/<script/i);
    expect(uploadedText).not.toContain("xss()");
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): getSponsors — year and status filters (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt:
//   - Accepts optional year and is_active args on getSponsors
//   - Queries `sponsors` table directly (not sponsors_active view — view won't
//     expose is_active until PR C recreates it)
//   - Applies .eq("year", year) when year is provided
//   - Applies .eq("is_active", is_active) when is_active is a boolean
// ---------------------------------------------------------------------------

describe("getSponsors — year and status filters (#199)", () => {
  function makeSelectChain(rows: unknown[] = []) {
    // Build a chainable mock that records .eq() calls
    // and resolves on .order() with { data: rows, error: null }
    const eqCalls: Array<[string, unknown]> = [];
    const chain: Record<string, unknown> = {};

    chain.eq = vi.fn((_col: string, _val: unknown) => {
      eqCalls.push([_col, _val]);
      return chain;
    });
    chain.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
    chain._eqCalls = eqCalls;

    return chain;
  }

  function makeFromMock(chain: ReturnType<typeof makeSelectChain>) {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(chain),
      }),
    };
  }

  it("called with no args: queries sponsors table (not the view) for current year", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await getSponsors();

    const fromArg = client.from.mock.calls[0][0] as string;
    // PR B must query `sponsors` directly — view doesn't expose is_active yet
    expect(fromArg).toBe("sponsors");
  });

  it("called with no args: does NOT apply an is_active filter (shows all statuses)", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await getSponsors();

    const isActiveCall = (chain._eqCalls as Array<[string, unknown]>).find(
      ([col]) => col === "is_active"
    );
    expect(isActiveCall).toBeUndefined();
  });

  it("called with year: 2025 — query filters by year=2025", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await _getSponsors({ year: 2025 });

    const yearCall = (chain._eqCalls as Array<[string, unknown]>).find(
      ([col]) => col === "year"
    );
    expect(yearCall).toBeDefined();
    expect(yearCall![1]).toBe(2025);
  });

  it("called with is_active: true — query filters to only active sponsors", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await _getSponsors({ is_active: true });

    const activeCall = (chain._eqCalls as Array<[string, unknown]>).find(
      ([col]) => col === "is_active"
    );
    expect(activeCall).toBeDefined();
    expect(activeCall![1]).toBe(true);
  });

  it("called with is_active: false — query filters to only inactive sponsors", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await _getSponsors({ is_active: false });

    const activeCall = (chain._eqCalls as Array<[string, unknown]>).find(
      ([col]) => col === "is_active"
    );
    expect(activeCall).toBeDefined();
    expect(activeCall![1]).toBe(false);
  });

  it("called with year: 2026, is_active: true — both filters applied", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await _getSponsors({ year: 2026, is_active: true });

    const eqCalls = chain._eqCalls as Array<[string, unknown]>;
    const yearCall = eqCalls.find(([col]) => col === "year");
    const activeCall = eqCalls.find(([col]) => col === "is_active");
    expect(yearCall).toBeDefined();
    expect(yearCall![1]).toBe(2026);
    expect(activeCall).toBeDefined();
    expect(activeCall![1]).toBe(true);
  });

  it("default sort: order() called with 'display_order'", async () => {
    const chain = makeSelectChain([]);
    const client = makeFromMock(chain);
    setClient(client);

    await getSponsors();

    expect(chain.order).toHaveBeenCalledWith("display_order");
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): createSponsor — no longer writes denorm contact fields (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt:
//   - Removes contact_name, contact_email, contact_phone from the insert payload
//   - Adds is_active to insert payload
//   - Accepts contact_ids in FormData and inserts sponsor_contacts rows
// ---------------------------------------------------------------------------

describe("createSponsor — no longer writes denorm contact fields (#199)", () => {
  function makeInsertMock() {
    const sponsorInsert = vi.fn().mockResolvedValue({ data: [{ id: "new-sponsor-id" }], error: null });
    const sponsorContactsInsert = vi.fn().mockResolvedValue({ error: null });

    const fromMock = vi.fn((table: string) => {
      if (table === "sponsor_contacts") {
        return { insert: sponsorContactsInsert };
      }
      return { insert: sponsorInsert };
    });

    return { fromMock, sponsorInsert, sponsorContactsInsert };
  }

  it("with contact_name/email/phone in FormData: insert payload does NOT include those fields", async () => {
    const { fromMock, sponsorInsert } = makeInsertMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Acme Corp",
      tier_id: "tier-uuid",
      contact_name: "Jane Doe",
      contact_email: "jane@example.com",
      contact_phone: "5551234567",
      payment_status: "pending",
      amount_paid: "0",
    });
    await createSponsor(fd);

    expect(sponsorInsert).toHaveBeenCalledTimes(1);
    const payload = sponsorInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("contact_name");
    expect(payload).not.toHaveProperty("contact_email");
    expect(payload).not.toHaveProperty("contact_phone");
  });

  it("happy path: insert called with name, tier_id, website, logo_url, is_active", async () => {
    const { fromMock, sponsorInsert } = makeInsertMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Acme Corp",
      tier_id: "tier-uuid",
      website: "https://acme.com",
      logo_url: "https://cdn.example.com/logo.png",
      payment_status: "pending",
      amount_paid: "0",
      is_active: "true",
    });
    const result = await createSponsor(fd);

    expect(result).toEqual({ success: true });
    expect(sponsorInsert).toHaveBeenCalledTimes(1);
    const payload = sponsorInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.name).toBe("Acme Corp");
    expect(payload.tier_id).toBe("tier-uuid");
    expect(payload).toHaveProperty("is_active");
  });

  it("is_active defaults to true if not specified in FormData", async () => {
    const { fromMock, sponsorInsert } = makeInsertMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Default Active Corp",
      tier_id: "tier-uuid",
      payment_status: "pending",
      amount_paid: "0",
    });
    await createSponsor(fd);

    const payload = sponsorInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.is_active).toBe(true);
  });

  it("is_active: false when explicitly set in FormData", async () => {
    const { fromMock, sponsorInsert } = makeInsertMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Inactive Corp",
      tier_id: "tier-uuid",
      payment_status: "pending",
      amount_paid: "0",
      is_active: "false",
    });
    await createSponsor(fd);

    const payload = sponsorInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.is_active).toBe(false);
  });

  it("contact_ids in FormData triggers sponsor_contacts INSERT for each contact", async () => {
    const { fromMock, sponsorContactsInsert } = makeInsertMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Linked Corp",
      tier_id: "tier-uuid",
      payment_status: "pending",
      amount_paid: "0",
      contact_ids: "contact-1,contact-2",
    });
    await createSponsor(fd);

    // sponsor_contacts.insert must be called (once with an array or twice individually)
    expect(sponsorContactsInsert).toHaveBeenCalled();
    // The inserted rows must reference the correct contact IDs
    const insertArg = sponsorContactsInsert.mock.calls[0][0];
    const rows = Array.isArray(insertArg) ? insertArg : [insertArg];
    const contactIds = rows.map((r: Record<string, unknown>) => r.contact_id);
    expect(contactIds).toContain("contact-1");
    expect(contactIds).toContain("contact-2");
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): updateSponsor — same denorm treatment (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt:
//   - Removes contact_name, contact_email, contact_phone from the update payload
//   - Adds is_active to update payload
//   - Reconciles sponsor_contacts via contact_ids in FormData
// ---------------------------------------------------------------------------

describe("updateSponsor — no longer writes denorm contact fields (#199)", () => {
  function makeUpdateMock() {
    const eqSponsor = vi.fn().mockResolvedValue({ error: null });
    const sponsorUpdate = vi.fn().mockReturnValue({ eq: eqSponsor });

    const sponsorContactsDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const sponsorContactsInsert = vi.fn().mockResolvedValue({ error: null });

    const fromMock = vi.fn((table: string) => {
      if (table === "sponsor_contacts") {
        return {
          insert: sponsorContactsInsert,
          delete: sponsorContactsDelete,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return { update: sponsorUpdate };
    });

    return { fromMock, sponsorUpdate, eqSponsor, sponsorContactsInsert, sponsorContactsDelete };
  }

  it("update payload excludes contact_name, contact_email, contact_phone", async () => {
    const { fromMock, sponsorUpdate } = makeUpdateMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Updated Corp",
      tier_id: "tier-uuid",
      contact_name: "Jane Doe",
      contact_email: "jane@example.com",
      contact_phone: "5551234567",
      payment_status: "paid",
      amount_paid: "500",
    });
    await updateSponsor("sponsor-uuid", fd);

    expect(sponsorUpdate).toHaveBeenCalledTimes(1);
    const payload = sponsorUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("contact_name");
    expect(payload).not.toHaveProperty("contact_email");
    expect(payload).not.toHaveProperty("contact_phone");
  });

  it("update payload includes is_active", async () => {
    const { fromMock, sponsorUpdate } = makeUpdateMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Updated Corp",
      tier_id: "tier-uuid",
      payment_status: "paid",
      amount_paid: "500",
      is_active: "false",
    });
    await updateSponsor("sponsor-uuid", fd);

    const payload = sponsorUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toHaveProperty("is_active");
    expect(payload.is_active).toBe(false);
  });

  it("contact_ids in FormData triggers sponsor_contacts reconciliation", async () => {
    const { fromMock, sponsorContactsInsert } = makeUpdateMock();
    setClient({ from: fromMock });

    const fd = makeFormData({
      name: "Updated Corp",
      tier_id: "tier-uuid",
      payment_status: "paid",
      amount_paid: "500",
      contact_ids: "contact-a,contact-b",
    });
    await updateSponsor("sponsor-uuid", fd);

    // sponsor_contacts must be touched (insert or delete+insert)
    expect(sponsorContactsInsert).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): getSponsorContacts (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt implements getSponsorContacts in actions.ts.
// ---------------------------------------------------------------------------

describe("getSponsorContacts (#199)", () => {
  it("returns contacts linked to a sponsor via sponsor_contacts join", async () => {
    const linkedContacts = [
      { contact_id: "c1", role: "primary", contacts: { id: "c1", full_name: "Jane Doe", email: "jane@example.com" } },
      { contact_id: "c2", role: "billing", contacts: { id: "c2", full_name: "Bob Smith", email: "bob@example.com" } },
    ];

    setClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: linkedContacts, error: null }),
        }),
      }),
    });

    const result = await _getSponsorContacts("sponsor-uuid");

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no contacts linked", async () => {
    setClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const result = await _getSponsorContacts("sponsor-uuid");
    expect(result).toEqual([]);
  });

  it("preserves role field on returned rows", async () => {
    const linkedContacts = [
      { contact_id: "c1", role: "billing", contacts: { id: "c1", full_name: "Jane Doe" } },
    ];

    setClient({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: linkedContacts, error: null }),
        }),
      }),
    });

    const result = await _getSponsorContacts("sponsor-uuid");
    expect(result[0]).toHaveProperty("role", "billing");
  });
});

// ---------------------------------------------------------------------------
// S18-B (RED): linkSponsorContact / unlinkSponsorContact (#199)
// ---------------------------------------------------------------------------
// These tests FAIL until Bolt implements linkSponsorContact / unlinkSponsorContact.
// ---------------------------------------------------------------------------

describe("linkSponsorContact / unlinkSponsorContact (#199)", () => {
  const mockRequireAdmin = vi.mocked(adminModule.requireAdmin);

  it("linkSponsorContact calls sponsor_contacts INSERT with correct shape; default role='primary'", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    await _linkSponsorContact("sponsor-id", "contact-id");

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.sponsor_id).toBe("sponsor-id");
    expect(payload.contact_id).toBe("contact-id");
    expect(payload.role).toBe("primary");
  });

  it("linkSponsorContact with explicit role='billing' stores correctly", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    await _linkSponsorContact("sponsor-id", "contact-id", "billing");

    const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.role).toBe("billing");
  });

  it("unlinkSponsorContact calls DELETE on sponsor_contacts with correct WHERE clause", async () => {
    const eqContact = vi.fn().mockResolvedValue({ error: null });
    const eqSponsor = vi.fn().mockReturnValue({ eq: eqContact });
    const mockDelete = vi.fn().mockReturnValue({ eq: eqSponsor });
    setClient({
      from: vi.fn().mockReturnValue({ delete: mockDelete }),
    });

    await _unlinkSponsorContact("sponsor-id", "contact-id");

    expect(mockDelete).toHaveBeenCalledTimes(1);
    // First eq: sponsor_id
    expect(eqSponsor).toHaveBeenCalledWith("sponsor_id", "sponsor-id");
    // Second eq: contact_id
    expect(eqContact).toHaveBeenCalledWith("contact_id", "contact-id");
  });

  it("linkSponsorContact calls requireAdmin() before the Supabase insert", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    setClient({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });

    await _linkSponsorContact("sponsor-id", "contact-id");

    const requireAdminOrder = mockRequireAdmin.mock.invocationCallOrder[0];
    const insertOrder = mockInsert.mock.invocationCallOrder[0];
    expect(requireAdminOrder).toBeLessThan(insertOrder);
  });

  it("unlinkSponsorContact calls requireAdmin() before the Supabase delete", async () => {
    const eqContact = vi.fn().mockResolvedValue({ error: null });
    const eqSponsor = vi.fn().mockReturnValue({ eq: eqContact });
    const mockDelete = vi.fn().mockReturnValue({ eq: eqSponsor });
    setClient({
      from: vi.fn().mockReturnValue({ delete: mockDelete }),
    });

    await _unlinkSponsorContact("sponsor-id", "contact-id");

    const requireAdminOrder = mockRequireAdmin.mock.invocationCallOrder[0];
    const deleteOrder = mockDelete.mock.invocationCallOrder[0];
    expect(requireAdminOrder).toBeLessThan(deleteOrder);
  });
});
