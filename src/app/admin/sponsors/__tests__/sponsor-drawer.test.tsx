/**
 * RED tests — sponsor-drawer.tsx (Sprint 20, issue #215)
 *
 * Section 1 (existing): Drawer width — sm:max-w-[540px]
 * Section 2 (NEW): Logo upload wiring — Bug 1
 * Section 3 (NEW): Initial contacts fetch — Bug 2
 *
 * Section 2 + 3 tests FAIL against current main because:
 *   - handleSubmit never calls uploadSponsorLogo
 *   - handleSubmit never calls getSponsorContacts
 *   - existing logo_url is NOT preserved when no new file is picked
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ContactPickResult } from "@/components/admin/contact-typeahead";
import type { Sponsor } from "@/types/database";

// ---------------------------------------------------------------------------
// Mocks — actions
// Must be at module top level (hoisted by Vitest).
// ---------------------------------------------------------------------------

vi.mock("../actions", () => ({
  createSponsor: vi.fn(async () => ({})),
  updateSponsor: vi.fn(async () => ({})),
  deleteSponsor: vi.fn(async () => ({})),
  uploadSponsorLogo: vi.fn(async () => ({ url: "https://cdn.example.com/new-logo.png" })),
  getSponsorContacts: vi.fn(async () => []),
  deleteSponsorLogo: vi.fn(async () => ({ success: true })),
}));

// ---------------------------------------------------------------------------
// Mocks — SponsorForm
//
// The mock is a vi.fn() so individual tests can call mockImplementation.
// Default implementation just renders a data-testid container and a submit button
// whose onSubmit payload is set by the test via the `_submitFd` ref below.
// ---------------------------------------------------------------------------

// A ref to feed a custom FormData from the test into the mock's submit button
let _submitFdForTest: FormData | null = null;
// A ref to capture the initialContacts the drawer passes to the form
let _capturedInitialContacts: ContactPickResult[] = [];

vi.mock("../sponsor-form", () => {
  const MockSponsorForm = vi.fn(
    ({
      initialContacts = [],
      onSubmit,
      loading,
    }: {
      initialContacts?: ContactPickResult[];
      onSubmit: (fd: FormData) => void | Promise<void>;
      onCancel: () => void;
      loading: boolean;
      [key: string]: unknown;
    }) => {
      // Store whatever initialContacts the drawer injected — tests inspect this
      _capturedInitialContacts = initialContacts;

      return (
        <div data-testid="sponsor-form">
          {loading && <span data-testid="form-loading">Saving...</span>}
          {initialContacts.map((c) => (
            <span key={c.id} data-testid={`initial-contact-${c.id}`}>
              {c.full_name}
            </span>
          ))}
          <button
            type="button"
            data-testid="mock-submit"
            onClick={() => {
              const fd = _submitFdForTest ?? new FormData();
              onSubmit(fd);
            }}
          >
            Submit
          </button>
        </div>
      );
    }
  );

  return {
    SponsorForm: MockSponsorForm,
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ConfirmDialog
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div data-testid="confirm-dialog" role="dialog" aria-label={title} />
    ) : null,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { SponsorDrawer } from "../sponsor-drawer";
import type { SponsorshipItemOption } from "../sponsor-form";
import * as actions from "../actions";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEMS: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

const SPONSOR: Sponsor = {
  id: "s-1",
  name: "Acme Corp",
  tier_id: "tier-gold",
  website: "https://acme.com",
  payment_status: "paid",
  amount_paid_cents: 500000,
  year: 2026,
  is_active: true,
  logo_url: "https://cdn.example.com/old-logo.png",
  created_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
  deleted_by: null,
  display_order: 0,
  stripe_payment_id: null,
};

const SPONSOR_NO_LOGO: Sponsor = {
  ...SPONSOR,
  id: "s-2",
  logo_url: null,
};

const SPONSOR_B: Sponsor = {
  ...SPONSOR,
  id: "s-99",
  name: "Beta Co",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Build a FormData that includes a File at key "logo"
function makeFormDataWithFile(file: File, extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("logo", file);
  fd.set("name", "Acme Corp");
  fd.set("tier_id", "tier-gold");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

// Build a FormData without a File (no logo key at all)
function makeFormDataNoFile(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("name", "Acme Corp");
  fd.set("tier_id", "tier-gold");
  if (!("contact_ids" in extra)) fd.set("contact_ids", "");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

function renderEditDrawer(sponsor: Sponsor = SPONSOR) {
  return render(
    <SponsorDrawer
      open={true}
      onOpenChange={vi.fn()}
      mode="edit"
      sponsor={sponsor}
      sponsorshipItems={ITEMS}
      onSuccess={vi.fn()}
    />
  );
}

function renderCreateDrawer() {
  return render(
    <SponsorDrawer
      open={true}
      onOpenChange={vi.fn()}
      mode="create"
      sponsorshipItems={ITEMS}
      onSuccess={vi.fn()}
    />
  );
}

async function clickSubmit() {
  await act(async () => {
    screen.getByTestId("mock-submit").click();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SponsorDrawer — Sprint 20 data-integrity tests (#215)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _submitFdForTest = null;
    _capturedInitialContacts = [];
    // Restore default mock behaviors after clearAllMocks
    vi.mocked(actions.uploadSponsorLogo).mockResolvedValue({
      url: "https://cdn.example.com/new-logo.png",
    });
    vi.mocked(actions.getSponsorContacts).mockResolvedValue([]);
    vi.mocked(actions.updateSponsor).mockResolvedValue({ success: true });
    vi.mocked(actions.createSponsor).mockResolvedValue({ success: true });
    // deleteSponsorLogo is not in actions.ts yet — cast to access the mock fn
    (actions as unknown as Record<string, ReturnType<typeof vi.fn>>).deleteSponsorLogo.mockResolvedValue({ success: true });
  });

  // =========================================================================
  // SECTION 1 (existing): Drawer width
  // =========================================================================
  describe("Drawer width — 540px (P1)", () => {
    it("SheetContent has sm:max-w-[540px] class when open in create mode", () => {
      renderCreateDrawer();
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).toContain("sm:max-w-[540px]");
    });

    it("SheetContent does NOT have sm:max-w-[480px] (old width)", () => {
      renderCreateDrawer();
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).not.toContain("sm:max-w-[480px]");
    });

    it("SheetContent has sm:max-w-[540px] when open in edit mode", () => {
      renderEditDrawer();
      const sheetContent = document.querySelector('[data-slot="sheet-content"]');
      expect(sheetContent).not.toBeNull();
      expect(sheetContent!.className).toContain("sm:max-w-[540px]");
    });
  });

  describe("Drawer renders correctly", () => {
    it("renders the sponsor form when open", () => {
      renderCreateDrawer();
      expect(screen.getByTestId("sponsor-form")).toBeInTheDocument();
    });

    it("shows 'New Sponsor' title in create mode", () => {
      renderCreateDrawer();
      expect(screen.getByText("New Sponsor")).toBeInTheDocument();
    });

    it("shows sponsor name in edit mode title", () => {
      renderEditDrawer();
      expect(screen.getByText(`Edit Sponsor: ${SPONSOR.name}`)).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      const { container } = render(
        <SponsorDrawer
          open={false}
          onOpenChange={vi.fn()}
          mode="create"
          sponsorshipItems={ITEMS}
          onSuccess={vi.fn()}
        />
      );
      const sheetContent = container.querySelector('[data-slot="sheet-content"]');
      if (sheetContent) {
        expect(sheetContent.getAttribute("data-open")).not.toBe("true");
      } else {
        expect(sheetContent).toBeNull();
      }
    });
  });

  // =========================================================================
  // SECTION 2: Logo upload wiring (Bug 1)
  //
  // Target behaviour after Bolt fix:
  //   handleSubmit inspects formData for a File at key "logo" with size > 0.
  //   If present: calls uploadSponsorLogo, sets logo_url = result.url, proceeds.
  //   If absent + edit + sponsor.logo_url exists: preserves existing logo_url.
  //   If uploadSponsorLogo errors: toast.error + does NOT call updateSponsor.
  // =========================================================================
  describe("Logo upload wiring — Bug 1", () => {
    it("calls uploadSponsorLogo when formData contains a File at key 'logo'", async () => {
      const logoFile = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      _submitFdForTest = makeFormDataWithFile(logoFile);

      renderEditDrawer();
      await clickSubmit();

      expect(vi.mocked(actions.uploadSponsorLogo)).toHaveBeenCalledTimes(1);
      const uploadArg = vi.mocked(actions.uploadSponsorLogo).mock.calls[0][0] as FormData;
      expect(uploadArg.get("file")).toBe(logoFile);
    });

    it("passes oldLogoUrl to uploadSponsorLogo when sponsor has existing logo_url", async () => {
      const logoFile = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      _submitFdForTest = makeFormDataWithFile(logoFile);

      renderEditDrawer(SPONSOR); // SPONSOR.logo_url is non-null

      await clickSubmit();

      const uploadArg = vi.mocked(actions.uploadSponsorLogo).mock.calls[0][0] as FormData;
      expect(uploadArg.get("oldLogoUrl")).toBe(SPONSOR.logo_url);
    });

    it("calls updateSponsor with logo_url equal to uploadSponsorLogo result URL", async () => {
      const UPLOAD_URL = "https://cdn.example.com/uploaded.png";
      vi.mocked(actions.uploadSponsorLogo).mockResolvedValue({ url: UPLOAD_URL });

      const logoFile = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      _submitFdForTest = makeFormDataWithFile(logoFile);

      renderEditDrawer();
      await clickSubmit();

      expect(vi.mocked(actions.updateSponsor)).toHaveBeenCalledTimes(1);
      const [, updateFd] = vi.mocked(actions.updateSponsor).mock.calls[0] as [string, FormData];
      expect(updateFd.get("logo_url")).toBe(UPLOAD_URL);
    });

    it("does NOT call updateSponsor when uploadSponsorLogo returns an error", async () => {
      vi.mocked(actions.uploadSponsorLogo).mockResolvedValue({ error: "Storage quota exceeded" });

      const logoFile = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      _submitFdForTest = makeFormDataWithFile(logoFile);

      renderEditDrawer();
      await clickSubmit();

      expect(vi.mocked(actions.updateSponsor)).not.toHaveBeenCalled();
    });

    it("calls toast.error when uploadSponsorLogo returns an error", async () => {
      vi.mocked(actions.uploadSponsorLogo).mockResolvedValue({ error: "Storage quota exceeded" });

      const logoFile = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      _submitFdForTest = makeFormDataWithFile(logoFile);

      renderEditDrawer();
      await clickSubmit();

      expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1);
    });

    it("preserves existing logo_url when no new file is submitted in edit mode", async () => {
      // FormData has no File at "logo" — just text fields
      _submitFdForTest = makeFormDataNoFile();

      renderEditDrawer(SPONSOR); // SPONSOR has logo_url

      await clickSubmit();

      expect(vi.mocked(actions.uploadSponsorLogo)).not.toHaveBeenCalled();
      expect(vi.mocked(actions.updateSponsor)).toHaveBeenCalledTimes(1);
      const [, updateFd] = vi.mocked(actions.updateSponsor).mock.calls[0] as [string, FormData];
      expect(updateFd.get("logo_url")).toBe(SPONSOR.logo_url);
    });

    it("does NOT call uploadSponsorLogo when no new file is submitted in edit mode", async () => {
      _submitFdForTest = makeFormDataNoFile();

      renderEditDrawer(SPONSOR_NO_LOGO);
      await clickSubmit();

      expect(vi.mocked(actions.uploadSponsorLogo)).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 3: Initial contacts fetch (Bug 2)
  //
  // Target behaviour after Bolt fix:
  //   On open + edit + sponsor: calls getSponsorContacts(sponsor.id).
  //   Passes fetched contacts to SponsorForm as initialContacts prop.
  //   Form renders only when contactsLoaded (or mode === "create").
  //   Re-fetches when a different sponsor is opened.
  // =========================================================================
  describe("Initial contacts fetch — Bug 2", () => {
    it("calls getSponsorContacts with sponsor.id when drawer opens in edit mode", async () => {
      vi.mocked(actions.getSponsorContacts).mockResolvedValue([
        {
          contact_id: "c-1",
          role: "primary",
          contacts: { id: "c-1", full_name: "Alice Tester", email: "alice@test.com" },
        },
      ]);

      renderEditDrawer();

      await waitFor(() => {
        expect(vi.mocked(actions.getSponsorContacts)).toHaveBeenCalledWith(SPONSOR.id);
      });
    });

    it("does NOT call getSponsorContacts in create mode", async () => {
      renderCreateDrawer();

      // Give any pending effects time to run
      await act(async () => {});

      expect(vi.mocked(actions.getSponsorContacts)).not.toHaveBeenCalled();
    });

    it("passes fetched contacts to SponsorForm as initialContacts", async () => {
      vi.mocked(actions.getSponsorContacts).mockResolvedValue([
        {
          contact_id: "c-1",
          role: "primary",
          contacts: { id: "c-1", full_name: "Alice Tester", email: "alice@test.com" },
        },
        {
          contact_id: "c-2",
          role: "primary",
          contacts: { id: "c-2", full_name: "Bob Builder", email: "bob@test.com" },
        },
      ]);

      renderEditDrawer();

      // After contacts load, the mock form renders them via data-testid
      await waitFor(() => {
        expect(screen.getByTestId("initial-contact-c-1")).toBeInTheDocument();
        expect(screen.getByTestId("initial-contact-c-2")).toBeInTheDocument();
      });

      expect(screen.getByText("Alice Tester")).toBeInTheDocument();
      expect(screen.getByText("Bob Builder")).toBeInTheDocument();
    });

    it("submitting edit drawer without touching contacts preserves existing contact_ids", async () => {
      // Bug 2 root cause: contact_ids submitted as empty string because
      // initialContacts is never populated. After fix, the drawer seeds
      // initialContacts from getSponsorContacts; the form serialises them
      // into contact_ids on submit.

      vi.mocked(actions.getSponsorContacts).mockResolvedValue([
        {
          contact_id: "c-1",
          role: "primary",
          contacts: { id: "c-1", full_name: "Alice Tester", email: "alice@test.com" },
        },
        {
          contact_id: "c-2",
          role: "primary",
          contacts: { id: "c-2", full_name: "Bob Builder", email: "bob@test.com" },
        },
      ]);

      renderEditDrawer();

      // Wait for contacts to load (needed so initialContacts is populated before submit)
      await waitFor(() => {
        expect(vi.mocked(actions.getSponsorContacts)).toHaveBeenCalledWith(SPONSOR.id);
      });

      // Build submit fd from whatever initialContacts the drawer sent to the form
      // (mirroring real form behaviour: contacts are serialised as-received)
      _submitFdForTest = makeFormDataNoFile({
        contact_ids: _capturedInitialContacts.map((c) => c.id).join(","),
      });

      await clickSubmit();

      expect(vi.mocked(actions.updateSponsor)).toHaveBeenCalledTimes(1);
      const [, updateFd] = vi.mocked(actions.updateSponsor).mock.calls[0] as [string, FormData];
      const submittedContactIds = updateFd.get("contact_ids") as string;
      expect(submittedContactIds).toContain("c-1");
      expect(submittedContactIds).toContain("c-2");
      expect(submittedContactIds).not.toBe("");
    });

    it("re-fires getSponsorContacts when a different sponsor is opened", async () => {
      vi.mocked(actions.getSponsorContacts).mockResolvedValue([]);

      const { rerender } = renderEditDrawer(SPONSOR);

      await waitFor(() => {
        expect(vi.mocked(actions.getSponsorContacts)).toHaveBeenCalledWith(SPONSOR.id);
      });

      // Close then reopen with a different sponsor
      rerender(
        <SponsorDrawer
          open={false}
          onOpenChange={vi.fn()}
          mode="edit"
          sponsor={SPONSOR_B}
          sponsorshipItems={ITEMS}
          onSuccess={vi.fn()}
        />
      );

      rerender(
        <SponsorDrawer
          open={true}
          onOpenChange={vi.fn()}
          mode="edit"
          sponsor={SPONSOR_B}
          sponsorshipItems={ITEMS}
          onSuccess={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(vi.mocked(actions.getSponsorContacts)).toHaveBeenCalledWith(SPONSOR_B.id);
      });

      // Called once for SPONSOR, once for SPONSOR_B
      expect(vi.mocked(actions.getSponsorContacts)).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // SECTION 4: Remove logo flag handling — #217
  //
  // Target behaviour after Bolt fix:
  //   handleSubmit checks formData.get("remove_logo") === "true".
  //   If true AND sponsor.logo_url:
  //     1. calls deleteSponsorLogo(sponsor.logo_url) — fire and proceed
  //     2. sets formData.logo_url = "" (→ null after updateSponsor normalization)
  //     3. deletes remove_logo and logo keys from formData
  //     4. calls updateSponsor (skips uploadSponsorLogo — no file)
  //   If remove_logo is absent, follows existing Sprint 20 flow unchanged.
  //
  // FAILS on current main:
  //   - deleteSponsorLogo does not exist in actions.ts
  //   - handleSubmit never checks for remove_logo flag
  // =========================================================================
  describe("Remove logo flag handling — #217", () => {
    // deleteSponsorLogo does not exist in actions.ts yet — that's intentional,
    // these are RED tests. Cast through the mock module record to access the
    // mock fn without a TypeScript error on the missing export.
    const actionsAny = actions as unknown as Record<string, ReturnType<typeof vi.fn>>;

    // -----------------------------------------------------------------------
    // Test S4a: deleteSponsorLogo called with sponsor.logo_url
    // FAILS on current main — deleteSponsorLogo is not imported or called
    // -----------------------------------------------------------------------
    it("calls deleteSponsorLogo with sponsor.logo_url when remove_logo=true", async () => {
      _submitFdForTest = makeFormDataNoFile({ remove_logo: "true" });

      renderEditDrawer(SPONSOR); // SPONSOR.logo_url = "https://cdn.example.com/old-logo.png"
      await clickSubmit();

      expect(actionsAny.deleteSponsorLogo).toHaveBeenCalledTimes(1);
      expect(actionsAny.deleteSponsorLogo).toHaveBeenCalledWith(SPONSOR.logo_url);
    });

    // -----------------------------------------------------------------------
    // Test S4b: updateSponsor called with logo_url="" when remove_logo=true
    // FAILS on current main — remove_logo flag never handled
    // -----------------------------------------------------------------------
    it("calls updateSponsor with logo_url='' when remove_logo=true", async () => {
      _submitFdForTest = makeFormDataNoFile({ remove_logo: "true" });

      renderEditDrawer(SPONSOR);
      await clickSubmit();

      expect(vi.mocked(actions.updateSponsor)).toHaveBeenCalledTimes(1);
      const [, updateFd] = vi.mocked(actions.updateSponsor).mock.calls[0] as [string, FormData];
      expect(updateFd.get("logo_url")).toBe("");
    });

    // -----------------------------------------------------------------------
    // Test S4c: uploadSponsorLogo NOT called when remove_logo=true
    // FAILS on current main — remove_logo flag never handled; without a File
    //   the current code path happens to skip upload, but once the flag branch
    //   is added the guard must still be explicit (remove wins over upload).
    // -----------------------------------------------------------------------
    it("does NOT call uploadSponsorLogo when remove_logo=true", async () => {
      _submitFdForTest = makeFormDataNoFile({ remove_logo: "true" });

      renderEditDrawer(SPONSOR);
      await clickSubmit();

      expect(vi.mocked(actions.uploadSponsorLogo)).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Test S4d: Regression — no remove_logo flag preserves existing logo_url
    // Guards against the Sprint 20 logo-preservation behaviour being broken
    // when Bolt adds the remove-logo branch.
    // This test currently passes on main; it must keep passing after the fix.
    // -----------------------------------------------------------------------
    it("preserves existing logo_url when remove_logo flag is absent (Sprint 20 regression guard)", async () => {
      _submitFdForTest = makeFormDataNoFile(); // no remove_logo key

      renderEditDrawer(SPONSOR);
      await clickSubmit();

      expect(actionsAny.deleteSponsorLogo).not.toHaveBeenCalled();
      expect(vi.mocked(actions.updateSponsor)).toHaveBeenCalledTimes(1);
      const [, updateFd] = vi.mocked(actions.updateSponsor).mock.calls[0] as [string, FormData];
      expect(updateFd.get("logo_url")).toBe(SPONSOR.logo_url);
    });
  });
});
