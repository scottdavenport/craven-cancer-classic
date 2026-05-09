"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadCsvButtonProps {
  /** Button label — Aria Phase 3 §B9: "Download CSV" */
  label: string;
  /** Server action or async function that returns a CSV string */
  fetchCsv: () => Promise<string>;
  /** Filename for the downloaded file, e.g. "teams-2026-05-08.csv" */
  filename: string;
}

export function DownloadCsvButton({ label, fetchCsv, filename }: DownloadCsvButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleDownload() {
    setExporting(true);
    try {
      const csv = await fetchCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[DownloadCsvButton] fetchCsv failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={exporting}>
      <Download className="size-4 mr-1" />
      {exporting ? "Exporting..." : label}
    </Button>
  );
}
