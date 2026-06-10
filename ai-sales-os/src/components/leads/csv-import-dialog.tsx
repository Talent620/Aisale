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
      if (!res.ok) throw new Error(data.error ?? "Import nie powiódł się");
      toast.success(
        `Zaimportowano: ${data.created}` +
          (data.deduped ? ` · duplikaty scalono: ${data.deduped}` : ""),
      );
      setOpen(false);
      setCsv(null);
      setPreview(null);
      setFileName("");
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import nie powiódł się");
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
          <DialogTitle>Import leadów z pliku CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pierwszy wiersz to nagłówki. Rozpoznawane kolumny: imię i nazwisko / name, email, telefon,
            firma, www, branża, miasto, stanowisko, notatka. Separator: przecinek lub średnik (Excel).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {fileName || "Wybierz plik CSV…"}
          </Button>

          {preview ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p>
                <span className="font-medium">{preview.rows}</span> wierszy do importu
                {preview.skipped ? ` · ${preview.skipped} pominięto (brak danych kontaktowych)` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rozpoznane kolumny: {preview.columns.join(", ") || "brak"}
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
            Te kontakty wyraziły zgodę marketingową (RODO) — zapisz ją ze źródłem „csv-import” i dzisiejszą datą.
          </label>

          <Button className="w-full" onClick={importNow} disabled={!preview?.rows || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Importuj {preview?.rows ?? 0} leadów
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
