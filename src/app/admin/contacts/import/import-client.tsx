"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { previewImport, commitImport } from "../import-actions";
import type { ParsedRow, CommitRow, ImportPreview } from "../csv-parser";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "upload" | "preview" | "success";

type RowState = {
  row: ParsedRow;
  checked: boolean;
  type: CommitRow["type"];
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ParsedRow["status"] }) {
  const config = {
    new: {
      label: "New",
      className: "bg-success-muted text-success",
    },
    duplicate: {
      label: "Skip duplicate",
      className: "bg-neutral-100 text-neutral-600",
    },
    invalid: {
      label: "Invalid",
      className: "bg-destructive/10 text-destructive",
    },
  } as const;

  const { label, className } = config[status];
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Upload step
// ---------------------------------------------------------------------------

function UploadStep({
  onPreview,
}: {
  onPreview: (file: File) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-xl">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${
            dragging
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/50 hover:bg-neutral-50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="w-10 h-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop a CSV file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accepts .csv files only
            </p>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-neutral-50 px-4 py-3">
          <svg
            className="w-5 h-5 text-brand flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-6">
        <Button
          disabled={!selectedFile}
          onClick={() => selectedFile && onPreview(selectedFile)}
        >
          Preview import
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview step
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: CommitRow["type"][] = ["player", "sponsor", "donor", "other"];

function PreviewStep({
  preview,
  rowStates,
  onToggleRow,
  onChangeType,
  onCommit,
  onReset,
  loading,
}: {
  preview: ImportPreview;
  rowStates: RowState[];
  onToggleRow: (index: number) => void;
  onChangeType: (index: number, type: CommitRow["type"]) => void;
  onCommit: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  const checkedCount = rowStates.filter((rs) => rs.checked).length;

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-neutral-50 px-5 py-4">
        <span className="text-sm font-semibold text-foreground">
          {preview.rows.length} rows total
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-success">{preview.importCount}</span> new
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-neutral-600">{preview.duplicateCount}</span> duplicates
        </span>
        {preview.invalidCount > 0 && (
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-destructive">{preview.invalidCount}</span> invalid
          </span>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {checkedCount} selected to import
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {["", "First Name", "Last Name", "Company", "City", "ZIP", "Golfer", "Import As", "Status"].map(
                (header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-neutral-500"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rowStates.map((rs, index) => {
              const { row } = rs;
              const isDisabled = row.status === "duplicate" || row.status === "invalid";
              return (
                <tr
                  key={index}
                  className={`transition-colors ${
                    rs.checked ? "bg-white" : "bg-neutral-50/50"
                  } ${isDisabled ? "opacity-50" : "hover:bg-neutral-50"}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={rs.checked}
                      disabled={isDisabled}
                      onChange={() => onToggleRow(index)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand disabled:cursor-not-allowed"
                      aria-label={`Select ${row.full_name || "row"}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {row.first_name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {row.last_name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-foreground max-w-[160px] truncate" title={row.company ?? undefined}>
                    {row.company ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {row.city ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {row.zip ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.golfer === "Yes" ? (
                      <span className="text-success font-medium">Yes</span>
                    ) : row.golfer === "No" ? (
                      <span className="text-muted-foreground">No</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={rs.type}
                      onValueChange={(val) =>
                        onChangeType(index, val as CommitRow["type"])
                      }
                      disabled={isDisabled || !rs.checked}
                    >
                      <SelectTrigger className="h-7 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge status={row.status} />
                    {row.error && (
                      <p className="mt-0.5 text-[0.6875rem] text-destructive">{row.error}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={onCommit}
          disabled={checkedCount === 0 || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing…
            </span>
          ) : (
            `Import ${checkedCount} contact${checkedCount !== 1 ? "s" : ""}`
          )}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={loading}>
          Start over
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success step
// ---------------------------------------------------------------------------

function SuccessStep({
  imported,
  skipped,
  onReset,
}: {
  imported: number;
  skipped: number;
  onReset: () => void;
}) {
  return (
    <div className="max-w-md rounded-lg border border-success/30 bg-success-muted p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {imported} contact{imported !== 1 ? "s" : ""} imported
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {skipped > 0
          ? `${skipped} row${skipped !== 1 ? "s" : ""} skipped (duplicates or unchecked).`
          : "All selected rows were imported successfully."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={onReset} variant="outline">
          Import another file
        </Button>
        <Link href="/admin/contacts" data-testid="success-view-contacts" className={buttonVariants({ variant: "default" })}>
          View contacts
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function ImportClient() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setRowStates([]);
    setLoading(false);
    setError(null);
    setImportResult(null);
  };

  const handlePreview = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const csvText = await file.text();
      if (!csvText.trim()) {
        setError("The file is empty.");
        return;
      }
      const result = await previewImport(csvText);
      setPreview(result);
      // Initialize row states: new rows checked, duplicates/invalid unchecked + disabled
      const states: RowState[] = result.rows.map((row) => ({
        row,
        checked: row.status === "new",
        type: row.suggested_type,
      }));
      setRowStates(states);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse the CSV. Make sure it matches the expected format."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRow = (index: number) => {
    setRowStates((prev) =>
      prev.map((rs, i) => (i === index ? { ...rs, checked: !rs.checked } : rs))
    );
  };

  const handleChangeType = (index: number, type: CommitRow["type"]) => {
    setRowStates((prev) =>
      prev.map((rs, i) => (i === index ? { ...rs, type } : rs))
    );
  };

  const handleCommit = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const selected: CommitRow[] = rowStates
        .filter((rs) => rs.checked)
        .map((rs) => ({ ...rs.row, type: rs.type }));

      const result = await commitImport(selected);

      if (result.errors.length > 0) {
        setError(result.errors.join("; "));
        return;
      }

      setImportResult({ imported: result.imported, skipped: result.skipped });
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <svg className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-destructive">Something went wrong</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading overlay during preview fetch */}
      {loading && step === "upload" && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
          <svg className="animate-spin h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Reading and checking for duplicates…
        </div>
      )}

      {step === "upload" && (
        <UploadStep onPreview={handlePreview} />
      )}

      {step === "preview" && preview && (
        <PreviewStep
          preview={preview}
          rowStates={rowStates}
          onToggleRow={handleToggleRow}
          onChangeType={handleChangeType}
          onCommit={handleCommit}
          onReset={handleReset}
          loading={loading}
        />
      )}

      {step === "success" && importResult && (
        <SuccessStep
          imported={importResult.imported}
          skipped={importResult.skipped}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
