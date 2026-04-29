/**
 * Sprint 21 · Issue #234 — Admin destructive-action copy consistency
 *
 * RED tests — all assertions target the NEW copy Bolt will ship in GREEN.
 * They fail against current main (copy unchanged).
 *
 * Areas covered:
 * 1. SponsorDrawer — confirm dialog description + toast on delete
 * 2. ScoreManager — confirm dialog title + description (with year interpolation)
 * 3. SponsorshipManager — cascade warning copy ("(no package)", no "Continue?")
 * 4. SponsorshipManager — single-delete dialog description (no linked sponsors path)
 * 5. PhotoModeration — deduped "Permanently" in title + description
 * 6. ContactDrawer — guard: reference Trash text must not drift
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

const {
  mockDeleteSponsor,
  mockGetSponsorContacts,
  mockUploadSponsorLogo,
  mockCreateSponsor,
  mockUpdateSponsor,
  mockDeleteSponsorLogo,
  mockDeleteAllScores,
  mockImportScoresFromCSV,
  mockGetSponsorshipItems,
  mockGetLinkedSponsorNames,
  mockDeleteSponsorshipItem,
  mockCreateSponsorshipItem,
  mockUpdateSponsorshipItem,
  mockDeletePhoto,
  mockUpdatePhotoStatus,
  mockDeleteContact,
  mockCreateContact,
  mockUpdateContact,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockDeleteSponsor: vi.fn(),
  mockGetSponsorContacts: vi.fn(),
  mockUploadSponsorLogo: vi.fn(),
  mockCreateSponsor: vi.fn(),
  mockUpdateSponsor: vi.fn(),
  mockDeleteSponsorLogo: vi.fn(),
  mockDeleteAllScores: vi.fn(),
  mockImportScoresFromCSV: vi.fn(),
  mockGetSponsorshipItems: vi.fn(),
  mockGetLinkedSponsorNames: vi.fn(),
  mockDeleteSponsorshipItem: vi.fn(),
  mockCreateSponsorshipItem: vi.fn(),
  mockUpdateSponsorshipItem: vi.fn(),
  mockDeletePhoto: vi.fn(),
  mockUpdatePhotoStatus: vi.fn(),
  mockDeleteContact: vi.fn(),
  mockCreateContact: vi.fn(),
  mockUpdateContact: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/admin/sponsors/actions", () => ({
  deleteSponsor: mockDeleteSponsor,
  getSponsorContacts: mockGetSponsorContacts,
  uploadSponsorLogo: mockUploadSponsorLogo,
  createSponsor: mockCreateSponsor,
  updateSponsor: mockUpdateSponsor,
  deleteSponsorLogo: mockDeleteSponsorLogo,
  getSponsors: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/admin/scores/actions", () => ({
  deleteAllScores: mockDeleteAllScores,
  importScoresFromCSV: mockImportScoresFromCSV,
  createScore: vi.fn(),
  updateScore: vi.fn(),
  deleteScore: vi.fn(),
}));

vi.mock("@/app/admin/sponsorships/actions", () => ({
  getSponsorshipItems: mockGetSponsorshipItems,
  getLinkedSponsorNames: mockGetLinkedSponsorNames,
  deleteSponsorshipItem: mockDeleteSponsorshipItem,
  createSponsorshipItem: mockCreateSponsorshipItem,
  updateSponsorshipItem: mockUpdateSponsorshipItem,
  getSponsorshipPurchases: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/admin/photos/actions", () => ({
  deletePhoto: mockDeletePhoto,
  updatePhotoStatus: mockUpdatePhotoStatus,
}));

vi.mock("@/app/admin/contacts/actions", () => ({
  deleteContact: mockDeleteContact,
  createContact: mockCreateContact,
  updateContact: mockUpdateContact,
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// jsdom doesn't implement window.location.reload
Object.defineProperty(window, "location", {
  writable: true,
  value: { ...window.location, reload: vi.fn() },
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { SponsorDrawer } from "@/app/admin/sponsors/sponsor-drawer";
import { ScoreManager } from "@/app/admin/scores/score-manager";
import { SponsorshipManager } from "@/app/admin/sponsorships/sponsorship-manager";
import { PhotoModeration } from "@/app/admin/photos/photo-moderation";
import { ContactModal } from "@/app/admin/contacts/contact-modal";

import type { Sponsor, Score, Photo, Contact, SponsorshipPurchase } from "@/types/database";
import type { SponsorshipItemOption } from "@/app/admin/sponsors/sponsor-form";
import type { SponsorshipItemWithCount } from "@/app/admin/sponsorships/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-1",
    name: "Acme Corp",
    tier_id: "tier-gold",
    website: null,
    logo_url: null,
    payment_status: "paid",
    amount_paid_cents: 500000,
    stripe_payment_id: null,
    display_order: 1,
    is_active: true,
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

const sponsorshipItems: SponsorshipItemOption[] = [
  { id: "tier-gold", name: "Gold", price_cents: 500000, year: 2026 },
];

function makeScore(overrides: Partial<Score> = {}): Score {
  return {
    id: "score-1",
    team_name: "The Eagles",
    total_score: 72,
    session: "morning",
    source: "manual",
    year: new Date().getFullYear(),
    created_at: new Date().toISOString(),
    individual_scores: [],
    team_id: null,
    ...overrides,
  };
}

function makeSpItem(overrides: Partial<SponsorshipItemWithCount> = {}): SponsorshipItemWithCount {
  return {
    id: "tier-1",
    name: "Gold Package",
    description: null,
    price_cents: 100000,
    max_quantity: null,
    sold_count: 0,
    active: true,
    benefits: [] as import("@/types/database").Json,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    sort_order: 1,
    year: 2026,
    active_sponsor_count: 0,
    ...overrides,
  };
}

const NO_PURCHASES: SponsorshipPurchase[] = [];

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    image_url: "https://example.com/photo.jpg",
    caption: "Tournament shot",
    status: "pending",
    uploaded_by_name: "Jane Doe",
    uploaded_by_email: "jane@example.com",
    year: 2026,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    full_name: "Bob Smith",
    first_name: null,
    last_name: null,
    email: "bob@example.com",
    phone: null,
    company: null,
    notes: null,
    salutation: null,
    source: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: false,
    types: ["individual"],
    year_first_seen: 2026,
    handicap: null,
    shirt_size: null,
    show_on_wall: false,
    recognition_name: null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSponsorContacts.mockResolvedValue([]);
  mockGetSponsorshipItems.mockResolvedValue([]);
  mockGetLinkedSponsorNames.mockResolvedValue([]);
  mockDeleteSponsor.mockResolvedValue({});
  mockDeleteAllScores.mockResolvedValue({});
  mockDeleteSponsorshipItem.mockResolvedValue({ ok: true });
  mockDeletePhoto.mockResolvedValue({});
  mockDeleteContact.mockResolvedValue({});
  vi.mocked(window.location.reload as ReturnType<typeof vi.fn>).mockClear();
});

// ===========================================================================
// Area 1 — SponsorDrawer
// ===========================================================================

describe("Area 1 — SponsorDrawer delete copy", () => {
  function renderDrawer(sponsor: Sponsor) {
    return render(
      <SponsorDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="edit"
        sponsor={sponsor}
        sponsorshipItems={sponsorshipItems}
        onSuccess={vi.fn()}
      />
    );
  }

  describe("confirm dialog description", () => {
    it("says 'moved to Trash' and mentions restore path (RED: currently says cannot be undone)", async () => {
      const user = userEvent.setup();
      const sponsor = makeSponsor();
      renderDrawer(sponsor);

      // Wait for contacts to load (getSponsorContacts mock resolves)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /delete sponsor/i })).toBeInTheDocument()
      );

      // Open confirm dialog
      await user.click(screen.getByRole("button", { name: /delete sponsor/i }));

      await waitFor(() => {
        expect(
          screen.getByText("This sponsor will be moved to Trash. You can restore from Admin → Trash.")
        ).toBeInTheDocument();
      });
    });

    it("does NOT say 'This action cannot be undone' (OLD copy must be gone)", async () => {
      const user = userEvent.setup();
      const sponsor = makeSponsor();
      renderDrawer(sponsor);

      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /delete sponsor/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete sponsor/i }));

      await waitFor(() => {
        // New copy replaces this entirely
        expect(
          screen.queryByText(/This sponsor will be removed\. This action cannot be undone\./)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("toast on delete success", () => {
    it("calls toast.success with 'Sponsor moved to Trash' (RED: currently 'Sponsor deleted')", async () => {
      const user = userEvent.setup();
      mockDeleteSponsor.mockResolvedValue({});
      const sponsor = makeSponsor();
      renderDrawer(sponsor);

      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /delete sponsor/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: /delete sponsor/i }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() =>
        expect(mockDeleteSponsor).toHaveBeenCalledWith(sponsor.id)
      );
      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith("Sponsor moved to Trash")
      );
    });

    it("does NOT call toast.success with old text 'Sponsor deleted'", async () => {
      const user = userEvent.setup();
      mockDeleteSponsor.mockResolvedValue({});
      const sponsor = makeSponsor();
      renderDrawer(sponsor);

      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /delete sponsor/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete sponsor/i }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => expect(mockDeleteSponsor).toHaveBeenCalled());
      expect(mockToastSuccess).not.toHaveBeenCalledWith("Sponsor deleted");
    });
  });
});

// ===========================================================================
// Area 2 — ScoreManager
// ===========================================================================

describe("Area 2 — ScoreManager clear-all copy", () => {
  const currentYear = new Date().getFullYear();

  function renderManager(scores: Score[]) {
    return render(<ScoreManager scores={scores} />);
  }

  describe("confirm dialog title", () => {
    it(`says 'Clear all scores for ${currentYear}?' (RED: currently 'Delete ALL scores for this year?')`, async () => {
      const user = userEvent.setup();
      renderManager([makeScore()]);

      const clearBtn = screen.getByRole("button", { name: /clear all/i });
      await user.click(clearBtn);

      await waitFor(() => {
        expect(
          screen.getByText(`Clear all scores for ${currentYear}?`)
        ).toBeInTheDocument();
      });
    });

    it("does NOT say 'Delete ALL scores for this year?'", async () => {
      const user = userEvent.setup();
      renderManager([makeScore()]);

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Delete ALL scores for this year?")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("confirm dialog description", () => {
    it(`contains 'permanently removes every score for ${currentYear}' (RED: old wording)`, async () => {
      const user = userEvent.setup();
      renderManager([makeScore()]);

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`permanently removes every score for ${currentYear}`))
        ).toBeInTheDocument();
      });
    });

    it("contains 'It cannot be undone' (terse trailing clause)", async () => {
      const user = userEvent.setup();
      renderManager([makeScore()]);

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/It cannot be undone\./)
        ).toBeInTheDocument();
      });
    });

    it("does NOT say 'All scores for the current year will be permanently removed'", async () => {
      const user = userEvent.setup();
      renderManager([makeScore()]);

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/All scores for the current year will be permanently removed/)
        ).not.toBeInTheDocument();
      });
    });
  });
});

// ===========================================================================
// Area 3 — SponsorshipManager cascade warning
// ===========================================================================

describe("Area 3 — SponsorshipManager cascade warning copy", () => {
  describe("(no package) replaces (deleted package)", () => {
    it("cascade warning shows '(no package)' when sponsors are linked (RED: currently '(deleted package)')", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-cascade",
        name: "Platinum Package",
        active_sponsor_count: 2,
      });
      mockGetLinkedSponsorNames.mockResolvedValue(["Acme Corp", "Beta LLC"]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer
      await user.click(screen.getByText("Platinum Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        expect(screen.getByText(/\(no package\)/)).toBeInTheDocument();
      });
    });

    it("cascade warning does NOT say '(deleted package)' (old copy gone)", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-cascade2",
        name: "Silver Package",
        active_sponsor_count: 1,
      });
      mockGetLinkedSponsorNames.mockResolvedValue(["Gamma Inc"]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      await user.click(screen.getByText("Silver Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        expect(screen.queryByText(/\(deleted package\)/)).not.toBeInTheDocument();
      });
    });
  });

  describe("'Continue?' removed from cascade warning", () => {
    it("cascade warning text does NOT end with 'Continue?'", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-continue",
        name: "Bronze Package",
        active_sponsor_count: 1,
      });
      mockGetLinkedSponsorNames.mockResolvedValue(["Delta Corp"]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      await user.click(screen.getByText("Bronze Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        // "Continue?" must not appear anywhere in dialog text
        expect(screen.queryByText(/Continue\?/)).not.toBeInTheDocument();
      });
    });

    it("cascade warning with overflow (>3 sponsors) also removes 'Continue?'", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-overflow",
        name: "Diamond Package",
        active_sponsor_count: 5,
      });
      mockGetLinkedSponsorNames.mockResolvedValue([
        "Alpha Corp",
        "Beta LLC",
        "Gamma Inc",
        "Delta Ltd",
        "Epsilon Co",
      ]);

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      await user.click(screen.getByText("Diamond Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Continue\?/)).not.toBeInTheDocument();
      });
    });
  });
});

// ===========================================================================
// Area 4 — SponsorshipManager single delete (no linked sponsors)
// ===========================================================================

describe("Area 4 — SponsorshipManager single-delete dialog copy", () => {
  describe("no-linked-sponsors delete description", () => {
    it("says 'no linked sponsors' and 'permanently deleted' (RED: old generic copy)", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-empty",
        name: "Empty Package",
        active_sponsor_count: 0,
      });

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      // Open edit drawer
      await user.click(screen.getByText("Empty Package"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "This package has no linked sponsors. It will be permanently deleted — this cannot be undone."
          )
        ).toBeInTheDocument();
      });
    });

    it("does NOT say 'This action cannot be undone. The package will be permanently removed.' (old copy gone)", async () => {
      const user = userEvent.setup();
      const item = makeSpItem({
        id: "tier-empty2",
        name: "Empty Package 2",
        active_sponsor_count: 0,
      });

      render(<SponsorshipManager items={[item]} purchases={NO_PURCHASES} />);

      await user.click(screen.getByText("Empty Package 2"));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /delete package/i })).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /delete package/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(
            "This action cannot be undone. The package will be permanently removed."
          )
        ).not.toBeInTheDocument();
      });
    });
  });
});

// ===========================================================================
// Area 5 — PhotoModeration
// ===========================================================================

describe("Area 5 — PhotoModeration confirm dialog copy", () => {
  function renderModeration(photos: Photo[]) {
    return render(<PhotoModeration photos={photos} />);
  }

  describe("dialog title deduplication", () => {
    it("title says 'Delete this photo?' (no leading 'Permanently')", async () => {
      const user = userEvent.setup();
      // Render on the "all" tab to ensure photos show
      const photo = makePhoto({ status: "approved" });
      renderModeration([photo]);

      // Switch to All tab to see approved photos
      await user.click(screen.getByRole("tab", { name: /^all/i }));

      const deleteBtn = document.querySelector("button[title='Delete photo']");
      expect(deleteBtn).not.toBeNull();
      await user.click(deleteBtn!);

      await waitFor(() => {
        expect(screen.getByText("Delete this photo?")).toBeInTheDocument();
      });
    });

    it("title does NOT say 'Permanently delete this photo?' (old deduped copy gone)", async () => {
      const user = userEvent.setup();
      const photo = makePhoto({ status: "approved" });
      renderModeration([photo]);

      await user.click(screen.getByRole("tab", { name: /^all/i }));

      const deleteBtn = document.querySelector("button[title='Delete photo']");
      expect(deleteBtn).not.toBeNull();
      await user.click(deleteBtn!);

      await waitFor(() => {
        expect(
          screen.queryByText("Permanently delete this photo?")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("dialog description", () => {
    it("description says 'permanently removes the photo' and mentions Trash", async () => {
      const user = userEvent.setup();
      const photo = makePhoto({ status: "approved" });
      renderModeration([photo]);

      await user.click(screen.getByRole("tab", { name: /^all/i }));

      const deleteBtn = document.querySelector("button[title='Delete photo']");
      expect(deleteBtn).not.toBeNull();
      await user.click(deleteBtn!);

      await waitFor(() => {
        expect(
          screen.getByText(
            "This permanently removes the photo — it cannot be restored from Trash."
          )
        ).toBeInTheDocument();
      });
    });

    it("does NOT say 'This action cannot be undone. The photo will be removed permanently.'", async () => {
      const user = userEvent.setup();
      const photo = makePhoto({ status: "approved" });
      renderModeration([photo]);

      await user.click(screen.getByRole("tab", { name: /^all/i }));

      const deleteBtn = document.querySelector("button[title='Delete photo']");
      expect(deleteBtn).not.toBeNull();
      await user.click(deleteBtn!);

      await waitFor(() => {
        expect(
          screen.queryByText(
            "This action cannot be undone. The photo will be removed permanently."
          )
        ).not.toBeInTheDocument();
      });
    });
  });
});

// ===========================================================================
// Area 6 — ContactDrawer reference guard
// ===========================================================================

describe("Area 6 — ContactDrawer reference text guard", () => {
  it("contact-drawer delete description still says the reference Trash text (must not drift)", async () => {
    const user = userEvent.setup();
    const contact = makeContact();

    render(
      <ContactModal
        open={true}
        mode="edit"
        contact={contact}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Open the confirm dialog
    await user.click(screen.getByRole("button", { name: /delete contact/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "They'll be moved to Trash and hidden from default views. You can restore from Admin → Trash later."
        )
      ).toBeInTheDocument();
    });
  });
});
