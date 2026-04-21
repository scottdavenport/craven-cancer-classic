"use client";

import { useRef } from "react";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  name?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  helpText?: string;
  error?: string;
  disabled?: boolean;
}

export function FileUploadField({
  label,
  accept,
  maxSizeMB,
  name,
  value,
  onChange,
  helpText,
  error,
  disabled,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (maxSizeMB !== undefined && file.size > maxSizeMB * 1024 * 1024) {
      return;
    }
    onChange(file);
  }

  function handleClear() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{label}</span>

      {value ? (
        <div
          data-testid="file-upload-chip"
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
        >
          <span className="truncate flex-1 text-foreground">{value.name}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground uppercase">
            {value.name.split(".").pop()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-testid="file-upload-clear"
            disabled={disabled}
            onClick={handleClear}
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="file-upload-trigger"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 transition-colors disabled:pointer-events-none disabled:opacity-50",
            error && "border-destructive"
          )}
        >
          <UploadCloud className="size-4 shrink-0" />
          <span>Choose file</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={handleChange}
      />

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {!error && helpText && (
        <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
      )}
    </div>
  );
}
