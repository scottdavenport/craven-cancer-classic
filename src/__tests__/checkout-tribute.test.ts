/**
 * checkout-tribute.test.ts — Sprint 33 RED phase
 *
 * Pins the contract for tribute purchase flow through /api/checkout:
 * 1. tribute_recipient is accepted in the request body
 * 2. tribute items require tribute_recipient — 400 if blank/missing
 * 3. non-tribute items ignore tribute_recipient (not persisted)
 * 4. tribute_recipient is persisted on sponsorship_purchases row
 * 5. Stripe metadata includes tribute_recipient
 * 6. Line item name format: "<item.name> — in honor of <recipient>"
 *
 * RED reason: The current handleSponsorshipCheckout does not accept or validate
 * tribute_recipient. Tests fail until Flux implements the Phase 2 changes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Stripe mock ---
const mockSessionCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockSessionCreate } },
  }),
  REGISTRATION_PRICE_CENTS: 70000,
}));

// --- next/headers mock ---
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// --- Supabase mock ---
const { mockFrom, mockRpc, mockCreateClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockCreateClient = vi.fn().mockResolvedValue({ from: mockFrom, rpc: mockRpc });
  return { mockFrom, mockRpc, mockCreateClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { POST } from "@/app/api/checkout/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeItemSelectChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ eq, single }));
  const select = vi.fn(() => ({ eq, single }));
  return { select };
}

function makeInsertChain(
  result: { data: unknown; error: unknown },
  capturedInsertPayload?: { value: Record<string, unknown> | null }
) {
  const single = vi.fn().mockResolvedValue(result);
  const selectAfterInsert = vi.fn(() => ({ single }));
  const insert = vi.fn((payload: Record<string, unknown>) => {
    if (capturedInsertPayload) {
      capturedInsertPayload.value = payload;
    }
    return { select: selectAfterInsert };
  });
  return { insert };
}

// ---------------------------------------------------------------------------
// Item fixtures
// ---------------------------------------------------------------------------

const TRIBUTE_ITEM = {
  id: "item-balloons",
  name: "Balloons",
  price_cents: 2000,
  active: true,
  category: "tribute",
};

const SPONSORSHIP_ITEM = {
  id: "item-champion",
  name: "Champion",
  price_cents: 500000,
  active: true,
  category: "sponsorship",
};

const SUPPORTER_ITEM = {
  id: "item-tee-sign",
  name: "Tee Sign",
  price_cents: 10000,
  active: true,
  category: "supporter",
};

// ---------------------------------------------------------------------------
// Base request bodies
// ---------------------------------------------------------------------------

const baseTributeBody = {
  type: "sponsorship",
  item_id: "item-balloons",
  purchaser_name: "Jane Doe",
  purchaser_email: "jane@example.com",
  tribute_recipient: "John Davenport",
};

const baseSponsorshipBody = {
  type: "sponsorship",
  item_id: "item-champion",
  purchaser_name: "Acme Corp",
  purchaser_email: "acme@example.com",
};

const baseSupporterBody = {
  type: "sponsorship",
  item_id: "item-tee-sign",
  purchaser_name: "Bob Smith",
  purchaser_email: "bob@example.com",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockResolvedValue({ from: mockFrom, rpc: mockRpc });
  mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });
});

function setupMocks(item: typeof TRIBUTE_ITEM, purchaseId = "purchase-uuid-tribute") {
  mockFrom.mockImplementation((table: string) => {
    if (table === "sponsorship_items") {
      return makeItemSelectChain({ data: item, error: null });
    }
    if (table === "sponsorship_purchases") {
      return makeInsertChain({ data: { id: purchaseId }, error: null });
    }
    return {};
  });
}

function setupMocksWithCapture(
  item: typeof TRIBUTE_ITEM,
  capturedInsertPayload: { value: Record<string, unknown> | null }
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "sponsorship_items") {
      return makeItemSelectChain({ data: item, error: null });
    }
    if (table === "sponsorship_purchases") {
      return makeInsertChain({ data: { id: "purchase-123" }, error: null }, capturedInsertPayload);
    }
    return {};
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/checkout — tribute purchases (Sprint 33)", () => {
  describe("tribute_recipient accepted in request body", () => {
    it("returns 200 when tribute_recipient is provided for a tribute item", async () => {
      setupMocks(TRIBUTE_ITEM);
      const res = await POST(makeRequest(baseTributeBody));
      expect(res.status).toBe(200);
    });

    it("returns 200 with a Stripe URL in the response", async () => {
      setupMocks(TRIBUTE_ITEM);
      const res = await POST(makeRequest(baseTributeBody));
      const body = await res.json();
      expect(body.url).toMatch(/checkout\.stripe\.com/);
    });
  });

  describe("validation — tribute items require tribute_recipient", () => {
    it("returns 400 when tribute item is purchased without tribute_recipient", async () => {
      setupMocks(TRIBUTE_ITEM);
      const body = { ...baseTributeBody };
      delete (body as Record<string, unknown>).tribute_recipient;

      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
    });

    it("returns 400 when tribute_recipient is an empty string for tribute item", async () => {
      setupMocks(TRIBUTE_ITEM);
      const res = await POST(
        makeRequest({ ...baseTributeBody, tribute_recipient: "" })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when tribute_recipient is whitespace-only for tribute item", async () => {
      setupMocks(TRIBUTE_ITEM);
      const res = await POST(
        makeRequest({ ...baseTributeBody, tribute_recipient: "   " })
      );
      expect(res.status).toBe(400);
    });

    it("error message indicates honoree name is required for tribute purchases", async () => {
      setupMocks(TRIBUTE_ITEM);
      const body = { ...baseTributeBody };
      delete (body as Record<string, unknown>).tribute_recipient;

      const res = await POST(makeRequest(body));
      const json = await res.json();
      expect(json.error).toMatch(/honoree|tribute|recipient|required/i);
    });

    it("does NOT call Stripe when tribute_recipient is missing on tribute item", async () => {
      setupMocks(TRIBUTE_ITEM);
      const body = { ...baseTributeBody };
      delete (body as Record<string, unknown>).tribute_recipient;

      await POST(makeRequest(body));
      expect(mockSessionCreate).not.toHaveBeenCalled();
    });
  });

  describe("tribute_recipient persisted on sponsorship_purchases row", () => {
    it("insert payload includes tribute_recipient when provided", async () => {
      const captured: { value: Record<string, unknown> | null } = { value: null };
      setupMocksWithCapture(TRIBUTE_ITEM, captured);

      await POST(makeRequest(baseTributeBody));

      expect(captured.value).not.toBeNull();
      expect(captured.value!.tribute_recipient).toBe("John Davenport");
    });

    it("insert payload includes tribute_recipient trimmed", async () => {
      const captured: { value: Record<string, unknown> | null } = { value: null };
      setupMocksWithCapture(TRIBUTE_ITEM, captured);

      await POST(makeRequest({ ...baseTributeBody, tribute_recipient: "  John Davenport  " }));

      expect(captured.value!.tribute_recipient).toBe("John Davenport");
    });
  });

  describe("Stripe metadata includes tribute_recipient", () => {
    it("Stripe session.create receives tribute_recipient in metadata", async () => {
      setupMocks(TRIBUTE_ITEM);
      await POST(makeRequest(baseTributeBody));

      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
      const call = mockSessionCreate.mock.calls[0][0] as {
        metadata: Record<string, string>;
      };
      expect(call.metadata.tribute_recipient).toBe("John Davenport");
    });
  });

  describe("line item name format for tribute purchases", () => {
    it("line item name is '<item.name> — in honor of <recipient>'", async () => {
      setupMocks(TRIBUTE_ITEM);
      await POST(makeRequest(baseTributeBody));

      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { product_data: { name: string } } }[];
      };
      const lineItemName = call.line_items[0].price_data.product_data.name;
      expect(lineItemName).toMatch(/Balloons\s*—\s*in honor of\s*John Davenport/);
    });

    it("line item name uses em dash (—) as separator", async () => {
      setupMocks(TRIBUTE_ITEM);
      await POST(makeRequest(baseTributeBody));

      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { product_data: { name: string } } }[];
      };
      const lineItemName = call.line_items[0].price_data.product_data.name;
      // Must contain the em dash character specifically
      expect(lineItemName).toContain("—");
    });
  });

  describe("non-tribute items ignore tribute_recipient", () => {
    it("sponsorship item purchase succeeds when tribute_recipient is provided (ignored, not rejected)", async () => {
      setupMocks(SPONSORSHIP_ITEM);
      const res = await POST(
        makeRequest({ ...baseSponsorshipBody, tribute_recipient: "Someone" })
      );
      expect(res.status).toBe(200);
    });

    it("tribute_recipient is NOT persisted for sponsorship item purchases", async () => {
      const captured: { value: Record<string, unknown> | null } = { value: null };
      setupMocksWithCapture(SPONSORSHIP_ITEM, captured);

      await POST(
        makeRequest({ ...baseSponsorshipBody, tribute_recipient: "Someone" })
      );

      // tribute_recipient must not be in the insert payload for non-tribute items
      expect(captured.value).not.toBeNull();
      expect(captured.value!.tribute_recipient).toBeUndefined();
    });

    it("tribute_recipient is NOT in Stripe metadata for sponsorship purchases", async () => {
      setupMocks(SPONSORSHIP_ITEM);
      await POST(
        makeRequest({ ...baseSponsorshipBody, tribute_recipient: "Someone" })
      );

      const call = mockSessionCreate.mock.calls[0][0] as {
        metadata: Record<string, string>;
      };
      expect(call.metadata.tribute_recipient).toBeUndefined();
    });

    it("supporter item purchase succeeds without tribute_recipient", async () => {
      setupMocks(SUPPORTER_ITEM);
      const res = await POST(makeRequest(baseSupporterBody));
      expect(res.status).toBe(200);
    });

    it("supporter item purchase line item name is just the item name (no honoree)", async () => {
      setupMocks(SUPPORTER_ITEM);
      await POST(makeRequest(baseSupporterBody));

      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { product_data: { name: string } } }[];
      };
      const lineItemName = call.line_items[0].price_data.product_data.name;
      // Must NOT contain "in honor of"
      expect(lineItemName).not.toMatch(/in honor of/i);
    });
  });

  describe("uses DB price_cents for tribute items (price integrity)", () => {
    it("Stripe unit_amount uses DB price (2000 cents), not client-supplied tampered price", async () => {
      setupMocks(TRIBUTE_ITEM);
      await POST(makeRequest({ ...baseTributeBody, price_cents: 1 }));

      const call = mockSessionCreate.mock.calls[0][0] as {
        line_items: { price_data: { unit_amount: number } }[];
      };
      expect(call.line_items[0].price_data.unit_amount).toBe(2000);
    });
  });
});
