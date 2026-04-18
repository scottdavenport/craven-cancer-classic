import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProspectCaptureForm } from "@/components/public/prospect-capture-form";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("ProspectCaptureForm", () => {
  it("renders name, email fields and submit button", () => {
    render(<ProspectCaptureForm contactType="sponsor" />);
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get notified/i })
    ).toBeInTheDocument();
  });

  it("shows company field when showCompany is true", () => {
    render(<ProspectCaptureForm contactType="sponsor" showCompany />);
    expect(
      screen.getByLabelText(/company \/ organization/i)
    ).toBeInTheDocument();
  });

  it("does not show company field by default", () => {
    render(<ProspectCaptureForm contactType="sponsor" />);
    expect(
      screen.queryByLabelText(/company \/ organization/i)
    ).not.toBeInTheDocument();
  });

  it("submits to /api/contacts with correct payload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const user = userEvent.setup();
    render(
      <ProspectCaptureForm
        contactType="sponsor"
        notesPrefix="sponsor prospect"
        showCompany
      />
    );

    await user.type(screen.getByLabelText(/your name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.type(
      screen.getByLabelText(/company \/ organization/i),
      "Acme Corp"
    );
    await user.click(screen.getByRole("button", { name: /get notified/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const [url, options] = mockFetch.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(url).toBe("/api/contacts");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body as string);
    expect(body.full_name).toBe("Jane Smith");
    expect(body.email).toBe("jane@example.com");
    expect(body.type).toBe("sponsor");
    expect(body.notes).toBe("sponsor prospect");
    expect(body.company_name).toBe("Acme Corp");
  });

  it("shows success message after successful submission", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const user = userEvent.setup();
    render(
      <ProspectCaptureForm
        contactType="sponsor"
        successMessage="We'll be in touch!"
      />
    );

    await user.type(screen.getByLabelText(/your name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /get notified/i }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("We'll be in touch!")
    );
    expect(
      screen.queryByRole("button", { name: /get notified/i })
    ).not.toBeInTheDocument();
  });

  it("shows error message on failed submission", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to save your information. Please try again." }),
    });

    const user = userEvent.setup();
    render(<ProspectCaptureForm contactType="sponsor" />);

    await user.type(screen.getByLabelText(/your name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /get notified/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to save your information. Please try again."
      )
    );
  });

  it("shows error message when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const user = userEvent.setup();
    render(<ProspectCaptureForm contactType="sponsor" />);

    await user.type(screen.getByLabelText(/your name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /get notified/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });
});
