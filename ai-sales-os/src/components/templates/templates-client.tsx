"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Star, Copy, Check } from "lucide-react";
import { CampaignChannel, TemplateKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

interface TemplateRow {
  id: string;
  name: string;
  kind: TemplateKind;
  channel: CampaignChannel | null;
  subject: string | null;
  body: string;
  tags: string[];
  variables: string[];
  isFavorite: boolean;
  usageCount: number;
}

const KINDS: TemplateKind[] = [
  "EMAIL",
  "DM",
  "AD",
  "FOLLOW_UP",
  "POST",
  "OFFER",
  "SUBJECT_LINE",
];

const KIND_LABELS: Record<TemplateKind, string> = {
  EMAIL: "E-mail",
  DM: "Wiadomość prywatna (DM)",
  AD: "Reklama",
  FOLLOW_UP: "Follow-up",
  POST: "Post",
  OFFER: "Oferta",
  SUBJECT_LINE: "Temat e-maila",
};

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  EMAIL: "E-mail",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  COLD_CALL: "Zimne telefony",
  MULTI: "Wiele kanałów",
};

export function TemplatesClient() {
  const [items, setItems] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/templates", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(t: TemplateRow) {
    const text = t.subject ? `${t.subject}\n\n${t.body}` : t.body;
    await navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Szablony"
        description="Gotowe, spójne z marką elementy do wielokrotnego użycia w outreachu."
      >
        <CreateTemplateDialog onCreated={load} />
      </PageHeader>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Brak szablonów"
          description="Zapisz najskuteczniejsze wiadomości jako szablony, aby szybko z nich korzystać."
          action={<CreateTemplateDialog onCreated={load} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {t.isFavorite ? (
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      ) : null}
                      <p className="truncate text-sm font-medium">{t.name}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{KIND_LABELS[t.kind]}</Badge>
                      {t.channel ? (
                        <span className="text-xs text-muted-foreground">
                          {CHANNEL_LABELS[t.channel]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copy(t)}>
                    {copiedId === t.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {t.subject ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Temat: </span>
                    {t.subject}
                  </p>
                ) : null}
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.body}
                </p>
                {t.variables.length ? (
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <code
                        key={v}
                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TemplateKind>("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Podaj nazwę szablonu");
      return;
    }
    if (body.trim().length < 1) {
      toast.error("Treść szablonu nie może być pusta");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          subject: subject.trim() || undefined,
          body: body.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Szablon zapisany");
      setName("");
      setKind("EMAIL");
      setSubject("");
      setBody("");
      setOpen(false);
      onCreated();
    } catch {
      toast.error("Nie udało się zapisać szablonu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Nowy szablon
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy szablon</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Nazwa</Label>
              <Input
                id="t-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E-mail wprowadzający — firmy produkcyjne"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-subject">Temat (opcjonalnie)</Label>
            <Input
              id="t-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Szybki pomysł dla {{company}}"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-body">Treść</Label>
            <Textarea
              id="t-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Cześć {{name}},\n\n…"}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Używaj {"{{name}}"}, {"{{company}}"} itp. jako zmiennych.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Zapisz szablon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
