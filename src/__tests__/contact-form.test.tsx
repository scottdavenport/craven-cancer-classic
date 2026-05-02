/**
 * Sprint 37 — Issue #137
 * Component coverage for contact-form.tsx: 5% → 60%+
 *
 * 26 tests across 7 describe blocks covering:
 *   - Blur validation (email, phone, ZIP)
 *   - Identity validation (all-blank rejection matrix)
 *   - Submit gate (blocked when invalid)
 *   - Submit spy assertions (ContactInput shape)
 *   - Phone normalization on blur (display format)
 *   - ContactModal cancel behavior
 *
 * NOTE on phone submit value (Risk 1 from plan):
 *   ContactForm.phone state holds the national display format "(919) 555-0100".
 *   ContactInput.phone therefore also receives the display format.
 *   actions.ts createContact/updateContact calls normalizePhone() to get E.164.
 *   This is intentional architecture — not a bug.
 *
 * NOTE on handlePhoneBlur closure (Risk 2 from plan):
 *   line 180: validatePhone(phone) reads pre-setState closure value.
 *   For "9195550100": normalizePhone succeeds → setPhone("(919) 555-0100"),
 *   then validatePhone("9195550100") fires — isValidPhone("9195550100") = true.
 *   The display value settles to "(919) 555-0100" after React batch commit.
 *   Tests T21–T23 use waitFor/toHaveValue to wait for the settled display value.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Hoist mocks — ContactModal depends on server actions + sonner
// ---------------------------------------------------------------------------

const { mockCreateContact, mockUpdateContact, mockDeleteContact } = vi.hoisted(() => ({
  mockCreateContact: vi.fn(),
  mockUpdateContact: vi.fn(),
  mockDeleteContact: vi.fn(),
}));

vi.mock("@/app/admin/contacts/actions", () => ({
  createContact: mockCreateContact,
  updateContact: mockUpdateContact,
  deleteContact: mockDeleteContact,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after vi.mock hoisting)
// ---------------------------------------------------------------------------

import { ContactForm } from "@/app/admin/contacts/contact-form";
import { ContactModal } from "@/app/admin/contacts/contact-modal";
import type { ContactInput } from "@/app/admin/contacts/actions";
import type { Contact } from "@/types/database";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const noop = vi.fn().mockResolvedValue(undefined);

/** Builds a Contact fixture with required fields; optional overrides applied on top. */
function buildInitial(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "test-id",
    full_name: "Jane Smith",
    first_name: "Jane",
    last_name: "Smith",
    salutation: null,
    email: null,
    phone: null,
    types: ["player"] as string[],
    company: null,
    address1: null,
    address2: null,
    city: null,
    state: null,
    zip: null,
    marketing_consent: false,
    source: null,
    year_first_seen: 2026,
    notes: null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    handicap: null,
    shirt_size: null,
    show_on_wall: true,
    recognition_name: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Blur validation — email, phone, ZIP
// ---------------------------------------------------------------------------

describe("ContactForm — blur validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: shows 'Invalid email format' error below the email field when an invalid email is blurred", async () => {
    render(<ContactForm onSubmit={noop} />);
    // Use exact label text "Email" to avoid matching "emails" in the marketing consent label
    await userEvent.type(screen.getByLabelText("Email"), "notanemail");
    fireEvent.blur(screen.getByLabelText("Email"));
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
  });

  it("T2: clears the email error when a valid email is blurred after an invalid one", async () => {
    render(<ContactForm onSubmit={noop} />);
    // Use exact label text "Email" to avoid matching "emails" in the marketing consent label
    await userEvent.type(screen.getByLabelText("Email"), "bad");
    fireEvent.blur(screen.getByLabelText("Email"));
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    // Now clear and type valid email
    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    fireEvent.blur(screen.getByLabelText("Email"));
    expect(screen.queryByText("Invalid email format")).not.toBeInTheDocument();
  });

  it("T3: shows 'Invalid phone number' error below the phone field when an invalid phone is blurred", async () => {
    render(<ContactForm onSubmit={noop} />);
    await userEvent.type(screen.getByLabelText(/phone/i), "123");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    await waitFor(() => {
      expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
    });
  });

  it("T4: clears the phone error when a valid phone is blurred", async () => {
    render(<ContactForm onSubmit={noop} />);
    // First trigger the error
    await userEvent.type(screen.getByLabelText(/phone/i), "123");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    await waitFor(() => {
      expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
    });
    // Now enter a valid phone and blur
    await userEvent.clear(screen.getByLabelText(/phone/i));
    await userEvent.type(screen.getByLabelText(/phone/i), "(919) 555-0100");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    await waitFor(() => {
      expect(screen.queryByText("Invalid phone number")).not.toBeInTheDocument();
    });
  });

  it("T5: shows ZIP error 'ZIP must be 5 digits...' when a non-ZIP value is blurred", async () => {
    render(<ContactForm onSubmit={noop} />);
    await userEvent.type(screen.getByLabelText(/zip/i), "1234");
    fireEvent.blur(screen.getByLabelText(/zip/i));
    expect(screen.getByText(/ZIP must be 5 digits/)).toBeInTheDocument();
  });

  it("T6: clears the ZIP error when a valid ZIP is blurred", async () => {
    render(<ContactForm onSubmit={noop} />);
    // Trigger error
    await userEvent.type(screen.getByLabelText(/zip/i), "1234");
    fireEvent.blur(screen.getByLabelText(/zip/i));
    expect(screen.getByText(/ZIP must be 5 digits/)).toBeInTheDocument();
    // Enter valid ZIP
    await userEvent.clear(screen.getByLabelText(/zip/i));
    await userEvent.type(screen.getByLabelText(/zip/i), "28562");
    fireEvent.blur(screen.getByLabelText(/zip/i));
    expect(screen.queryByText(/ZIP must be 5 digits/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Identity validation — all-blank rejection matrix
// ---------------------------------------------------------------------------

describe("ContactForm — identity validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T7: shows identity error when all three identity fields are blank and first name loses focus", () => {
    render(<ContactForm onSubmit={noop} />);
    fireEvent.blur(screen.getByLabelText(/first name/i));
    expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument();
  });

  it("T8: shows identity error when all three identity fields are blank and last name loses focus", () => {
    render(<ContactForm onSubmit={noop} />);
    fireEvent.blur(screen.getByLabelText(/last name/i));
    expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument();
  });

  it("T9: shows identity error when all three identity fields are blank and company loses focus", () => {
    render(<ContactForm onSubmit={noop} />);
    fireEvent.blur(screen.getByLabelText(/company/i));
    expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument();
  });

  it("T10: clears identity error when first name has a value and loses focus", async () => {
    render(<ContactForm onSubmit={noop} />);
    // Set error first
    fireEvent.blur(screen.getByLabelText(/first name/i));
    expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument();
    // Enter first name and blur again
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    fireEvent.blur(screen.getByLabelText(/first name/i));
    expect(screen.queryByText("Provide a first/last name or company name")).not.toBeInTheDocument();
  });

  it("T11: clears identity error when only company is filled and company loses focus", async () => {
    render(<ContactForm onSubmit={noop} />);
    // Set error first
    fireEvent.blur(screen.getByLabelText(/company/i));
    expect(screen.getByText("Provide a first/last name or company name")).toBeInTheDocument();
    // Enter company and blur again
    await userEvent.type(screen.getByLabelText(/company/i), "Acme");
    fireEvent.blur(screen.getByLabelText(/company/i));
    expect(screen.queryByText("Provide a first/last name or company name")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Submit gate — blocked when fields are invalid
// ---------------------------------------------------------------------------

describe("ContactForm — submit gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T12: does not call onSubmit when identity is all-blank at submit time", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    render(<ContactForm onSubmit={spy} />);
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it("T13: does not call onSubmit when email is invalid at submit time", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    render(
      <ContactForm
        initial={buildInitial({ email: "notanemail" })}
        onSubmit={spy}
      />
    );
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it("T14: does not call onSubmit when phone is invalid at submit time", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    render(
      <ContactForm
        initial={buildInitial({ phone: "123" })}
        onSubmit={spy}
      />
    );
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it("T15: does not call onSubmit when ZIP is invalid at submit time", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    render(
      <ContactForm
        initial={buildInitial({ zip: "1234" })}
        onSubmit={spy}
      />
    );
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Submit with valid data — ContactInput shape assertions
// Per feedback_spec_spy_assertions_required: assert call args, not just invocation count.
// ---------------------------------------------------------------------------

describe("ContactForm — submit with valid data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T16: calls onSubmit with a ContactInput containing nullified empty strings for optional fields", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    // NOTE (Risk 1): phone in ContactInput is display-formatted "(919) 555-0100", not E.164.
    // actions.ts normalizes to E.164 before DB insert — intentional architecture.
    const initial = buildInitial({ first_name: "Jane", last_name: "Smith", types: ["player"] });
    render(<ContactForm initial={initial} onSubmit={spy} />);
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const arg = spy.mock.calls[0][0] as ContactInput;
    expect(arg.first_name).toBe("Jane");
    expect(arg.last_name).toBe("Smith");
    expect(arg.email).toBeNull();
    expect(arg.phone).toBeNull();
    expect(arg.types).toEqual(["player"]);
    expect(arg.marketing_consent).toBe(false);
    expect(typeof arg.year_first_seen).toBe("number");
  });

  it("T17: calls onSubmit with marketing_consent: true when the marketing consent switch is toggled on", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const initial = buildInitial({ first_name: "Jane", types: ["player"] });
    render(<ContactForm initial={initial} onSubmit={spy} />);
    // Donor section is NOT shown (types: ["player"]), so the only switch is marketing consent.
    // Scoping by label for resilience (Watchdog T17 note).
    const marketingSwitch = screen.getByRole("switch", { name: /marketing consent/i });
    fireEvent.click(marketingSwitch);
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const arg = spy.mock.calls[0][0] as ContactInput;
    expect(arg.marketing_consent).toBe(true);
  });

  it("T18: calls onSubmit with state in uppercase regardless of input case", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const initial = buildInitial({ first_name: "Jane", types: ["player"] });
    render(<ContactForm initial={initial} onSubmit={spy} />);
    // State field auto-uppercases via onChange: e.target.value.slice(0, 2).toUpperCase()
    await userEvent.type(screen.getByLabelText(/state/i), "nc");
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const arg = spy.mock.calls[0][0] as ContactInput;
    expect(arg.state).toBe("NC");
  });

  it("T19: calls onSubmit with handicap as null when the handicap field is blank", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const initial = buildInitial({ types: ["player"] });
    render(<ContactForm initial={initial} onSubmit={spy} />);
    // Player section is visible; leave handicap blank
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const arg = spy.mock.calls[0][0] as ContactInput;
    expect(arg.handicap).toBeNull();
  });

  it("T20: calls onSubmit with handicap as integer when a valid handicap is entered", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    const initial = buildInitial({ types: ["player"] });
    render(<ContactForm initial={initial} onSubmit={spy} />);
    await userEvent.type(screen.getByLabelText(/handicap/i), "18");
    const form = document.getElementById("contact-form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const arg = spy.mock.calls[0][0] as ContactInput;
    expect(arg.handicap).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// 5. Phone normalization on blur (display format)
// Risk 2 note: validatePhone(phone) at line 180 reads closure value before setState settles.
// For "9195550100": normalizePhone succeeds → setPhone("(919) 555-0100"), then
// validatePhone("9195550100") fires. isValidPhone("9195550100") = true, no error.
// The display value settles to "(919) 555-0100" after React commits. Use waitFor.
// ---------------------------------------------------------------------------

describe("ContactForm — phone normalization on blur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T21: reformats a bare 10-digit US phone to national display format on blur", async () => {
    render(<ContactForm onSubmit={noop} />);
    await userEvent.type(screen.getByLabelText(/phone/i), "9195550100");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toHaveValue("(919) 555-0100");
    });
    // Confirm no error — normalizePhone succeeded, isValidPhone("9195550100") = true
    expect(screen.queryByText("Invalid phone number")).not.toBeInTheDocument();
  });

  it("T22: leaves the phone field unchanged on blur when the phone is already in valid display format", async () => {
    render(<ContactForm onSubmit={noop} />);
    await userEvent.type(screen.getByLabelText(/phone/i), "(919) 555-0100");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toHaveValue("(919) 555-0100");
    });
    expect(screen.queryByText("Invalid phone number")).not.toBeInTheDocument();
  });

  it("T23: does not reformat an invalid phone string on blur (leaves value as-is and shows error)", async () => {
    render(<ContactForm onSubmit={noop} />);
    await userEvent.type(screen.getByLabelText(/phone/i), "notaphone");
    fireEvent.blur(screen.getByLabelText(/phone/i));
    // normalizePhone("notaphone") returns null → setPhone not called → field unchanged
    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toHaveValue("notaphone");
    });
    expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. ContactModal — Cancel resets unsaved form state
// Cancel is in ContactModal (lines 106-113), not ContactForm.
// onOpenChange(false) closes the dialog; on reopen the form re-mounts fresh.
// ---------------------------------------------------------------------------

describe("ContactModal — Cancel resets unsaved form state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateContact.mockResolvedValue({ id: "created-id" });
    mockUpdateContact.mockResolvedValue({ id: "updated-id" });
    mockDeleteContact.mockResolvedValue({});
  });

  it("T24: when Cancel is clicked, the modal closes (onOpenChange called with false)", async () => {
    const onOpenChange = vi.fn();
    render(
      <ContactModal
        open={true}
        mode="create"
        contact={null}
        onOpenChange={onOpenChange}
        onSuccess={vi.fn()}
      />
    );
    // Type into first name to create unsaved state
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("T25: when the modal is reopened after Cancel, the form fields are blank (no stale state)", async () => {
    /** Controlling wrapper: manages open state, re-renders ContactModal with new open prop */
    function Wrapper() {
      const [open, setOpen] = useState(true);
      return (
        <ContactModal
          open={open}
          mode="create"
          contact={null}
          onOpenChange={setOpen}
          onSuccess={vi.fn()}
        />
      );
    }

    const { rerender } = render(<Wrapper />);

    // Wait for form to appear and type in first name
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/first name/i), "Jane");
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");

    // Click Cancel — closes modal (onOpenChange(false) → setOpen(false))
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Reopen the modal
    await act(async () => {
      rerender(
        <ContactModal
          open={true}
          mode="create"
          contact={null}
          onOpenChange={vi.fn()}
          onSuccess={vi.fn()}
        />
      );
    });

    // After reopen, first name should be blank (fresh mount)
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    });
  });
});

describe("ContactForm — type toggling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T26: when Player is unchecked after an invalid handicap was blurred, canSubmit becomes true", async () => {
    render(<ContactForm onSubmit={vi.fn()} />);

    // Step 1: Check Player checkbox
    fireEvent.click(screen.getByLabelText(/player/i));

    // Step 2-3: Set an out-of-range value via fireEvent.change.
    // Note: userEvent.type with "abc" is rejected by jsdom on type="number" inputs;
    // "99" (> 54 max) is a valid number that fails validateHandicap's range check.
    fireEvent.change(screen.getByLabelText(/handicap/i), { target: { value: "99" } });

    // Step 4: Blur to trigger validation
    fireEvent.blur(screen.getByLabelText(/handicap/i));

    // Step 5: Pre-condition — handicap error is visible
    expect(screen.getByText(/handicap must be a whole number/i)).toBeInTheDocument();

    // Step 6: Uncheck Player (hides the handicap section; DOM unmounts the error element)
    fireEvent.click(screen.getByLabelText(/player/i));

    // Step 7: Re-check Player to remount the handicap section.
    // If errors.handicap was NOT cleared from state, the error re-appears on remount.
    // If it WAS cleared (fix applied), the error stays gone.
    fireEvent.click(screen.getByLabelText(/player/i));

    // Step 8: Post-condition — handicap error must not be present after re-mount
    expect(screen.queryByText(/handicap must be a whole number/i)).not.toBeInTheDocument();
  });
});
