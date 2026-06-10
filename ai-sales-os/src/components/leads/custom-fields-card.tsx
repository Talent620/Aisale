"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Free-form key→value fields on a lead (stored in Lead.customFields JSON). */
export function CustomFieldsCard({
  leadId,
  fields,
}: {
  leadId: string;
  fields: Record<string, string>;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(next: Record<string, string>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customFields: next }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pola zapisane");
      setKey("");
      setValue("");
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać pól");
    } finally {
      setBusy(false);
    }
  }

  const entries = Object.entries(fields);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListPlus className="h-4 w-4" /> Pola niestandardowe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak pól — dodaj cokolwiek potrzebuje Twój proces (NIP, nr umowy, kampania źródłowa…).
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">{k}</span>
                  <span className="block truncate font-medium">{v}</span>
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-secondary"
                  onClick={() => {
                    const next = { ...fields };
                    delete next[k];
                    save(next);
                  }}
                  aria-label={`Usuń ${k}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input placeholder="Pole" value={key} onChange={(e) => setKey(e.target.value)} className="w-32" />
          <Input placeholder="Wartość" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button
            variant="outline"
            size="icon"
            disabled={busy || !key.trim() || !value.trim()}
            onClick={() => save({ ...fields, [key.trim()]: value.trim() })}
            aria-label="Dodaj pole"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
