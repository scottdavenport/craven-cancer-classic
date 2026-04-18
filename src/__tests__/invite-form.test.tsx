/**
 * S3-5: Admin invite UI — InviteForm component.
 *
 * Tests fail today because the component does not exist yet.
 * After Bolt builds `src/app/admin/settings/invite-form.tsx`, these pass.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mock global fetch — controlled per test
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Import component (fails until Bolt creates the file)
// ---------------------------------------------------------------------------
async function getInviteForm() {
  // @ts-ignore — module does not exist yet (red phase)
  const mod = await import("@/app/admin/settings/invite-form" as string);
  return mod.InviteForm ?? mod.default;
}

describe("S3-5 InviteForm", () => {
  describe("rendering", () => {
    it("renders an email input", async () => {
      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      const emailInput = screen.getByRole("textbox", { name: /email/i });
      expect(emailInput).toBeDefined();
    });

    it("renders a role selector with Admin and Viewer options", async () => {
      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      // combobox or listbox or select element labelled "role"
      const roleEl = screen.getByLabelText(/role/i);
      expect(roleEl).toBeDefined();

      // The options must include Admin and Viewer
      const html = document.body.innerHTML;
      expect(html.toLowerCase()).toContain("admin");
      expect(html.toLowerCase()).toContain("viewer");
    });

    it("renders a Send Invite button", async () => {
      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      const button = screen.getByRole("button", { name: /send invite/i });
      expect(button).toBeDefined();
    });
  });

  describe("submit — success path", () => {
    it("shows inline success message containing the invited email after 200", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "newuser@example.com");
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.toLowerCase()).toContain("newuser@example.com");
      });
    });

    it("POSTs to /api/invite with email and role in the request body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "test@example.com");
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/invite",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("test@example.com"),
          })
        );
      });
    });
  });

  describe("submit — error path (409 duplicate)", () => {
    it("shows inline error message on 409 and keeps form populated", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: "Invite already pending for this email" }),
      });

      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "dupe@example.com");
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.toLowerCase()).toContain("pending");
      });

      // Email input must still be populated (form not cleared)
      const emailInput = screen.getByRole("textbox", { name: /email/i }) as HTMLInputElement;
      expect(emailInput.value).toBe("dupe@example.com");
    });

    it("shows inline error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const InviteForm = await getInviteForm();
      render(<InviteForm />);

      await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "err@example.com");
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.toLowerCase()).toMatch(/error|fail|wrong/);
      });
    });
  });
});
