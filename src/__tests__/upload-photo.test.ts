/**
 * Tests for MIME-type allowlist on photo upload — Issue S2-6
 *
 * Validates that:
 * - Disallowed MIME types (e.g. text/html) are rejected with 400
 * - All allowlisted image MIME types succeed
 * - The stored filename extension is derived from file.type, not file.name
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Hoist mock functions so they're available in vi.mock factory ----
const { mockUpload, mockGetPublicUrl, mockInsert } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
  }),
}));

// Import route handler AFTER mocks are set up
import { POST } from "@/app/api/upload-photo/route";

// Helper: build a minimal Request with FormData
function buildRequest(fields: {
  fileType: string;
  fileName: string;
  fileSize?: number;
  uploaderName?: string;
}): Request {
  const {
    fileType,
    fileName,
    fileSize = 100,
    uploaderName = "Test User",
  } = fields;

  const fileContent = new Uint8Array(fileSize).fill(0);
  const file = new File([fileContent], fileName, { type: fileType });

  const formData = new FormData();
  formData.append("photo", file);
  formData.append("uploader_name", uploaderName);

  return new Request("http://localhost/api/upload-photo", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload-photo — MIME validation (S2-6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: storage upload succeeds
    mockUpload.mockResolvedValue({ error: null });

    // Default: getPublicUrl returns a URL
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.com/photos/test.jpg" },
    });

    // Default: DB insert succeeds
    mockInsert.mockResolvedValue({ error: null });
  });

  // ---- Rejection cases ----

  it("returns 400 with 'Invalid file type' for text/html", async () => {
    const req = buildRequest({ fileType: "text/html", fileName: "evil.html" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid file type");
  });

  it("returns 400 with 'Invalid file type' for application/pdf", async () => {
    const req = buildRequest({ fileType: "application/pdf", fileName: "doc.pdf" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid file type");
  });

  it("returns 400 for an html file with a .jpg extension in the name", async () => {
    // Attacker renames evil.html → evil.jpg but file.type still reveals the truth
    const req = buildRequest({ fileType: "text/html", fileName: "evil.jpg" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid file type");
  });

  // ---- Allowlisted types ----

  it("accepts image/jpeg and derives .jpg extension", async () => {
    const req = buildRequest({ fileType: "image/jpeg", fileName: "photo.jpeg" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify the filename passed to storage ends in .jpg (from MIME, not file.name)
    const uploadCall = mockUpload.mock.calls[0];
    const storedFileName: string = uploadCall[0];
    expect(storedFileName).toMatch(/\.jpg$/);
  });

  it("accepts image/png and derives .png extension", async () => {
    const req = buildRequest({ fileType: "image/png", fileName: "photo.png" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const storedFileName: string = mockUpload.mock.calls[0][0];
    expect(storedFileName).toMatch(/\.png$/);
  });

  it("accepts image/webp and derives .webp extension", async () => {
    const req = buildRequest({ fileType: "image/webp", fileName: "photo.webp" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const storedFileName: string = mockUpload.mock.calls[0][0];
    expect(storedFileName).toMatch(/\.webp$/);
  });

  it("accepts image/gif and derives .gif extension", async () => {
    const req = buildRequest({ fileType: "image/gif", fileName: "photo.gif" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const storedFileName: string = mockUpload.mock.calls[0][0];
    expect(storedFileName).toMatch(/\.gif$/);
  });

  // ---- Extension derived from MIME, not file.name ----

  it("stores .jpg extension even when file.name uses a different extension", async () => {
    // JPEG content but filename says .html — extension must come from MIME
    const req = buildRequest({ fileType: "image/jpeg", fileName: "legit.html" });
    const res = await POST(req);
    // MIME is image/jpeg so it passes validation
    expect(res.status).toBe(200);

    const storedFileName: string = mockUpload.mock.calls[0][0];
    expect(storedFileName).toMatch(/\.jpg$/);
    expect(storedFileName).not.toMatch(/\.html/);
  });

  // ---- Pre-existing validation still works ----

  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();
    formData.append("uploader_name", "Test User");
    const req = new Request("http://localhost/api/upload-photo", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided");
  });

  it("returns 400 when uploader_name is missing", async () => {
    const file = new File([new Uint8Array(100)], "photo.jpg", {
      type: "image/jpeg",
    });
    const formData = new FormData();
    formData.append("photo", file);
    const req = new Request("http://localhost/api/upload-photo", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Name is required");
  });
});
