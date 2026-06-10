"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { csvToLeadRows } from "@/lib/csv";

/** Import leads from a CSV file (client parses for preview; server ingests). */
export function CsvImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<{ rows: number; columns: string[]; skipped: number } | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(f: File | undefined | null) {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsv(text);
      const parsed = csvToLeadRows(text);
      setPreview({ rows: parsed.rows.length, columns: parsed.recognised, skipped: parsed.skipped });
    };
    reader.readAsText(f);
  }

  async function importNow() {
    if (!csv) return;
    setBusy(true);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, marketingConsent: consent }),
      });
      const data = (await res.json()) as { created?: number; deduped?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(
        `Imported ${data.created} lead${data.created === 1 ? "" : "s"}` +
          (data.deduped ? ` · ${data.deduped} duplicate(s) merged` : ""),
      );
      setOpen(false);
      setCsv(null);
      setPreview(null);
      setFileName("");
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            First row must be headers. Recognised columns (PL/EN): name, email, phone/telefon,
            company/firma, website/www, industry/branża, region/miasto, position/stanowisko,
            notes/notatka. Comma or semicolon delimited.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {fileName || "Choose CSV file…"}
          </Button>

          {preview ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p>
                <span className="font-medium">{preview.rows}</span> importable rows
                {preview.skipped ? ` · ${preview.skipped} skipped (no contact data)` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recognised columns: {preview.columns.join(", ") || "none"}
              </p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            These contacts gave marketing consent (GDPR) — record it with source “csv-import” and
            today&apos;s timestamp.
          </label>

          <Button className="w-full" onClick={importNow} disabled={!preview?.rows || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Import {preview?.rows ?? 0} leads
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
