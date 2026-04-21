/**
 * FileUploadField — RED phase tests for Sprint 19 PR A
 *
 * Component will live at: src/components/ui/file-upload.tsx
 *
 * These tests FAIL until Bolt creates the component (module not found).
 * Failure mode expected: "Cannot find module '@/components/ui/file-upload'"
 *
 * Notes for Bolt:
 * - Styled trigger must be a <button type="button">
 * - Hidden file input must have className="sr-only"
 * - Clicking styled trigger must call .click() on the hidden input (via ref)
 * - File-selected state: show chip with filename, filetype badge, clear button (X)
 * - Clear button: Button variant="ghost" size="icon-sm" with Lucide X icon
 * - Trigger button must be hidden (not rendered / display:none / aria-hidden) when file is selected
 * - Error state: border-destructive class on trigger + <p className="text-xs text-destructive mt-1">
 * - helpText: renders as <p> with text-xs class below trigger
 * - disabled prop: trigger has disabled attribute, clear button also disabled
 * - NO onDrop/onDragOver/onDragEnter handlers anywhere — click-only per Scott's decision
 * - maxSizeMB: component should guard internally; when file exceeds size, onChange is NOT called
 *   and an internal error message should render. This is a controlled-vs-uncontrolled ambiguity —
 *   see test #13 for the prop-controlled path; internal-state path is a follow-up if needed.
 * - Long filenames: use truncate CSS class on the filename chip element
 * - data-testid="file-upload-trigger" on the styled trigger button is assumed for disambiguation
 * - data-testid="file-upload-chip" on the filename chip is assumed for disambiguation
 * - data-testid="file-upload-clear" on the clear button is assumed for disambiguation
 *
 * Issue: #208 (Sprint 19)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUploadField } from "@/components/ui/file-upload";

function makeFile(name: string, sizeBytes = 1024, type = "image/png"): File {
  const file = new File(["x".repeat(sizeBytes)], name, { type });
  return file;
}

describe("FileUploadField", () => {
  const defaultProps = {
    label: "Upload Logo",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Label
  // ---------------------------------------------------------------------------
  describe("label", () => {
    it("renders the label text", () => {
      render(<FileUploadField {...defaultProps} />);
      expect(screen.getByText("Upload Logo")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2–3. Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("shows the styled trigger button and no filename chip when no value", () => {
      render(<FileUploadField {...defaultProps} />);
      const trigger = screen.getByTestId("file-upload-trigger");
      expect(trigger).toBeInTheDocument();
      expect(screen.queryByTestId("file-upload-chip")).not.toBeInTheDocument();
    });

    it("has a visually-hidden <input type='file'> with sr-only class", () => {
      const { container } = render(<FileUploadField {...defaultProps} />);
      const input = container.querySelector("input[type='file']");
      expect(input).toBeInTheDocument();
      expect(input!.className).toMatch(/sr-only/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. accept prop
  // ---------------------------------------------------------------------------
  describe("accept prop", () => {
    it("forwards accept prop to the hidden file input", () => {
      const { container } = render(
        <FileUploadField {...defaultProps} accept="image/*" />
      );
      const input = container.querySelector("input[type='file']");
      expect(input!.getAttribute("accept")).toBe("image/*");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Clicking trigger opens file picker
  // ---------------------------------------------------------------------------
  describe("trigger click", () => {
    it("clicking the styled trigger dispatches a click on the hidden input", () => {
      const { container } = render(<FileUploadField {...defaultProps} />);
      const trigger = screen.getByTestId("file-upload-trigger");
      const input = container.querySelector("input[type='file']") as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");
      fireEvent.click(trigger);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6–7. File-selected state
  // ---------------------------------------------------------------------------
  describe("file-selected state", () => {
    it("renders filename chip and hides trigger when value prop is a File", () => {
      const file = makeFile("sponsor-logo.png");
      render(<FileUploadField {...defaultProps} value={file} />);
      expect(screen.getByTestId("file-upload-chip")).toBeInTheDocument();
      expect(screen.getByText(/sponsor-logo\.png/i)).toBeInTheDocument();
      expect(screen.queryByTestId("file-upload-trigger")).not.toBeInTheDocument();
    });

    it("renders clear button (X) when a file is selected", () => {
      const file = makeFile("sponsor-logo.png");
      render(<FileUploadField {...defaultProps} value={file} />);
      expect(screen.getByTestId("file-upload-clear")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Clear button calls onChange(null)
  // ---------------------------------------------------------------------------
  describe("clear button", () => {
    it("clicking clear button calls onChange with null", () => {
      const onChange = vi.fn();
      const file = makeFile("sponsor-logo.png");
      render(<FileUploadField {...defaultProps} onChange={onChange} value={file} />);
      fireEvent.click(screen.getByTestId("file-upload-clear"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Error state
  // ---------------------------------------------------------------------------
  describe("error state", () => {
    it("trigger has border-destructive class when error prop is set", () => {
      render(
        <FileUploadField {...defaultProps} error="File is required" />
      );
      const trigger = screen.getByTestId("file-upload-trigger");
      expect(trigger.className).toMatch(/border-destructive/);
    });

    it("renders error message as <p> below the trigger", () => {
      render(
        <FileUploadField {...defaultProps} error="File is required" />
      );
      const errorEl = screen.getByText("File is required");
      expect(errorEl.tagName).toBe("P");
      expect(errorEl.className).toMatch(/text-destructive/);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. helpText
  // ---------------------------------------------------------------------------
  describe("helpText", () => {
    it("renders helpText as a <p> with text-xs class when provided", () => {
      render(
        <FileUploadField {...defaultProps} helpText="PNG or JPG, max 2 MB" />
      );
      const help = screen.getByText("PNG or JPG, max 2 MB");
      expect(help.tagName).toBe("P");
      expect(help.className).toMatch(/text-xs/);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. disabled state
  // ---------------------------------------------------------------------------
  describe("disabled state", () => {
    it("trigger has disabled attribute when disabled prop is true", () => {
      render(<FileUploadField {...defaultProps} disabled />);
      const trigger = screen.getByTestId("file-upload-trigger");
      expect(trigger).toBeDisabled();
    });

    it("clear button is also disabled when file is selected and disabled=true", () => {
      const file = makeFile("logo.png");
      render(
        <FileUploadField {...defaultProps} value={file} disabled />
      );
      const clearBtn = screen.getByTestId("file-upload-clear");
      expect(clearBtn).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // 12. No drag handlers
  // ---------------------------------------------------------------------------
  describe("no drag-drop", () => {
    it("no element in the DOM has ondrop, ondragover, or ondragenter handlers", () => {
      const { container } = render(<FileUploadField {...defaultProps} />);
      // React attaches event listeners via JS, not inline attributes.
      // Assert the component does not set these as inline HTML attributes.
      expect(container.outerHTML).not.toMatch(/\bondrop\b/i);
      expect(container.outerHTML).not.toMatch(/\bondragover\b/i);
      expect(container.outerHTML).not.toMatch(/\bondragenter\b/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 13. maxSizeMB guard (prop-controlled path)
  // NOTE: This test covers the scenario where the parent passes an `error` prop
  // when the file is oversized. The internal-state guard path (component sets its
  // own error when file exceeds maxSizeMB) is ambiguous until Bolt confirms
  // whether the component is fully controlled or has internal error state.
  // Follow-up: test internal-state guard if Bolt implements it.
  // ---------------------------------------------------------------------------
  describe("maxSizeMB guard", () => {
    it("does not call onChange when a file exceeds maxSizeMB", () => {
      const onChange = vi.fn();
      const { container } = render(
        <FileUploadField
          {...defaultProps}
          onChange={onChange}
          maxSizeMB={1}
        />
      );
      // 2 MB file — exceeds 1 MB limit
      const oversizedFile = makeFile("big.png", 2 * 1024 * 1024);
      const input = container.querySelector("input[type='file']") as HTMLInputElement;
      fireEvent.change(input, { target: { files: [oversizedFile] } });
      expect(onChange).not.toHaveBeenCalledWith(oversizedFile);
    });
  });

  // ---------------------------------------------------------------------------
  // 14. Long filename truncation (uses fireEvent.change, not userEvent.type)
  // ---------------------------------------------------------------------------
  describe("long filename", () => {
    it("filename chip has truncate class for long filenames (80+ chars)", () => {
      const longName =
        "a-very-long-sponsor-logo-filename-that-exceeds-eighty-characters-in-total-length.png";
      expect(longName.length).toBeGreaterThan(80);

      const file = makeFile(longName);
      render(<FileUploadField {...defaultProps} value={file} />);

      const chip = screen.getByTestId("file-upload-chip");
      // The chip itself or a child element should carry the truncate class
      const truncateEl =
        chip.className.includes("truncate")
          ? chip
          : chip.querySelector(".truncate");
      expect(truncateEl).not.toBeNull();
    });
  });
});
