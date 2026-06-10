"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Share2,
  Sparkles,
  Loader2,
  Send,
  CalendarClock,
  Trash2,
  Copy,
  Check,
  Megaphone,
  FileText,
  Pencil,
  X,
} from "lucide-react";
import type { ContentKind, SocialChannel, SocialPostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { SOCIAL_CHANNEL_LABELS, SOCIAL_POST_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface SocialPostRow {
  id: string;
  channel: SocialChannel;
  kind: ContentKind;
  title: string | null;
  body: string;
  cta: string | null;
  link: string | null;
  imageUrl: string | null;
  hashtags: string[];
  status: SocialPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalId: string | null;
  error: string | null;
  simulated: boolean;
  createdAt: string;
}

export interface ChannelStatusRow {
  channel: SocialChannel;
  live: boolean;
  detail: string;
}

const CHANNELS: SocialChannel[] = ["FACEBOOK", "INSTAGRAM", "GOOGLE_BUSINESS", "LINKEDIN"];

export function SocialClient({
  posts,
  offers,
  channels,
  kpis,
}: {
  posts: SocialPostRow[];
  offers: { id: string; name: string }[];
  channels: ChannelStatusRow[];
  kpis: { publishedCount: number; scheduledCount: number; draftCount: number };
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<SocialChannel>("FACEBOOK");
  const [kind, setKind] = useState<"POST" | "AD">("POST");
  const [topic, setTopic] = useState("");
  const [offerId, setOfferId] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  async function generate() {
    if (topic.trim().length < 3) {
      toast.error("Opisz temat lub cel posta");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          kind,
          topic: topic.trim(),
          offerId: offerId || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Szkic wygenerowany — sprawdź poniżej");
      setTopic("");
      router.refresh();
    } catch {
      toast.error("Generowanie nie powiodło się — spróbuj ponownie");
    } finally {
      setGenerating(false);
    }
  }

  async function publish(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}/publish`, { method: "POST" });
      const data = (await res.json()) as SocialPostRow & { error?: string };
      if (!res.ok) throw new Error();
      if (data.status === "PUBLISHED") toast.success("Post opublikowany");
      else toast.error(data.error ?? "Publikacja nie powiodła się");
      router.refresh();
    } catch {
      toast.error("Publikacja nie powiodła się");
    } finally {
      setBusyId(null);
    }
  }

  async function schedule(id: string) {
    if (!scheduleAt) {
      toast.error("Najpierw wybierz datę i godzinę");
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Post zaplanowany");
      setScheduleAt("");
      router.refresh();
    } catch {
      toast.error("Planowanie nie powiodło się");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: editBody,
          title: editTitle || null,
          imageUrl: editImageUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Post zaktualizowany");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Aktualizacja nie powiodła się");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Post usunięty");
      router.refresh();
    } catch {
      toast.error("Usuwanie nie powiodło się");
    } finally {
      setBusyId(null);
    }
  }

  function copyText(p: SocialPostRow) {
    const text = [p.title, p.body, p.cta ? `👉 ${p.cta}` : null, p.hashtags.join(" ")]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Studio"
        description="AI pisze reklamy i posty na Facebooka, Instagram i Google — Ty sprawdzasz, planujesz albo publikujesz."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Opublikowane" value={kpis.publishedCount} icon={Send} accent="success" />
        <KpiCard label="Zaplanowane" value={kpis.scheduledCount} icon={CalendarClock} accent="warning" />
        <KpiCard label="Szkice" value={kpis.draftCount} icon={FileText} />
      </div>

      {/* Channel connections */}
      <div className="flex flex-wrap gap-2">
        {channels.map((c) => (
          <Badge key={c.channel} variant={c.live ? "default" : "secondary"} title={c.detail}>
            {SOCIAL_CHANNEL_LABELS[c.channel]} · {c.live ? "połączono" : "symulacja"}
          </Badge>
        ))}
      </div>

      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Generuj z AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Kanał</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as SocialChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {SOCIAL_CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "POST" | "AD")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">Post organiczny</SelectItem>
                  <SelectItem value="AD">Płatna reklama</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Oferta (opcjonalnie)</Label>
              <Select value={offerId || "none"} onValueChange={(v) => setOfferId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Bez oferty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez oferty</SelectItem>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-topic">Temat / cel</Label>
            <Textarea
              id="social-topic"
              placeholder='np. „Promuj nasz pakiet strony w 7 dni dla lokalnych barberów — podkreśl mobile i widoczność w Google”'
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generuj szkic
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="Brak postów"
          description="Wygeneruj pierwszą reklamę lub post powyżej — AI pisze, Ty akceptujesz i publikujesz."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const meta = SOCIAL_POST_STATUS_META[p.status];
            const editing = editingId === p.id;
            const busy = busyId === p.id;
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {p.kind === "AD" ? <Megaphone className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
                        {SOCIAL_CHANNEL_LABELS[p.channel]} · {p.kind === "AD" ? "Reklama" : "Post"}
                      </Badge>
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                        {p.status === "PUBLISHED" && p.simulated ? " (symulacja)" : ""}
                      </Badge>
                      {p.scheduledAt && p.status === "SCHEDULED" ? (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.scheduledAt), "d MMM yyyy HH:mm")}
                        </span>
                      ) : null}
                      {p.publishedAt ? (
                        <span className="text-xs text-muted-foreground">
                          opublikowano {formatDistanceToNow(new Date(p.publishedAt), { addSuffix: true })}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => copyText(p)} title="Kopiuj tekst">
                        {copiedId === p.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      {p.status !== "PUBLISHED" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edytuj"
                            onClick={() => {
                              if (editing) setEditingId(null);
                              else {
                                setEditingId(p.id);
                                setEditBody(p.body);
                                setEditTitle(p.title ?? "");
                                setEditImageUrl(p.imageUrl ?? "");
                              }
                            }}
                          >
                            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" title="Usuń" onClick={() => remove(p.id)} disabled={busy}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {editing ? (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div className="space-y-1.5">
                        <Label>Nagłówek</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Treść</Label>
                        <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Adres obrazka {p.channel === "INSTAGRAM" ? "(wymagany dla Instagrama)" : "(opcjonalnie)"}</Label>
                        <Input
                          placeholder="https://…"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => saveEdit(p.id)} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Zapisz
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "space-y-2 rounded-lg border border-border p-4",
                        p.channel === "INSTAGRAM" ? "bg-gradient-to-br from-fuchsia-500/5 to-amber-500/5" : "bg-muted/20",
                      )}
                    >
                      {p.title ? <p className="font-medium text-foreground">{p.title}</p> : null}
                      <p className="whitespace-pre-wrap text-sm text-foreground/90">{p.body}</p>
                      {p.cta ? <p className="text-sm font-medium text-primary">👉 {p.cta}</p> : null}
                      {p.hashtags.length ? (
                        <p className="text-xs text-sky-600 dark:text-sky-400">{p.hashtags.join(" ")}</p>
                      ) : null}
                      {p.link ? <p className="truncate text-xs text-muted-foreground">{p.link}</p> : null}
                      {p.error ? <p className="text-xs text-destructive">Błąd: {p.error}</p> : null}
                    </div>
                  )}

                  {p.status !== "PUBLISHED" && !editing ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Input
                        type="datetime-local"
                        className="w-auto"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                      />
                      <Button variant="outline" size="sm" onClick={() => schedule(p.id)} disabled={busy}>
                        <CalendarClock className="h-4 w-4" /> Zaplanuj
                      </Button>
                      <Button size="sm" onClick={() => publish(p.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Publikuj teraz
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
