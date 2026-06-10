"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Megaphone, Loader2, Plus } from "lucide-react";
import { CampaignChannel, CampaignStatus } from "@prisma/client";
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
import { pct } from "@/lib/utils";

interface Opt {
  id: string;
  name: string;
}

interface CampaignRow {
  id: string;
  name: string;
  goal: string | null;
  channel: CampaignChannel;
  status: CampaignStatus;
  sentCount: number;
  repliedCount: number;
  convertedCount: number;
  audience: { name: string } | null;
  offer: { name: string } | null;
  _count: { messages: number };
}

const NONE = "NONE";
const CHANNELS: CampaignChannel[] = [
  "EMAIL",
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "COLD_CALL",
  "MULTI",
];
const STATUSES: CampaignStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
];

const STATUS_VARIANT: Record<CampaignStatus, "default" | "secondary" | "success" | "warning" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  ARCHIVED: "outline",
};

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  EMAIL: "E-mail",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  COLD_CALL: "Zimne telefony",
  MULTI: "Wiele kanałów",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywna",
  PAUSED: "Wstrzymana",
  COMPLETED: "Zakończona",
  ARCHIVED: "Zarchiwizowana",
};

export function CampaignsClient({
  audiences,
  offers,
}: {
  audiences: Opt[];
  offers: Opt[];
}) {
  const [items, setItems] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kampanie"
        description="Grupuj działania outreach w mierzalne kampanie."
      >
        <CreateCampaignDialog audiences={audiences} offers={offers} onCreated={load} />
      </PageHeader>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Brak kampanii"
          description="Utwórz pierwszą kampanię, aby uporządkować outreach i śledzić odpowiedzi."
          action={
            <CreateCampaignDialog
              audiences={audiences}
              offers={offers}
              onCreated={load}
            />
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CHANNEL_LABELS[c.channel]}
                        {c.audience ? ` · ${c.audience.name}` : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                  </div>
                  {c.goal ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.goal}</p>
                  ) : null}
                  <div className="grid grid-cols-4 gap-2 border-t pt-3 text-center">
                    <Stat label="Szkice" value={c._count.messages} />
                    <Stat label="Wysłano" value={c.sentCount} />
                    <Stat label="Odpowiedzi" value={c.repliedCount} />
                    <Stat
                      label="% odpowiedzi"
                      value={c.sentCount ? `${pct(c.repliedCount, c.sentCount)}%` : "—"}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CreateCampaignDialog({
  audiences,
  offers,
  onCreated,
}: {
  audiences: Opt[];
  offers: Opt[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("EMAIL");
  const [status, setStatus] = useState<CampaignStatus>("DRAFT");
  const [audienceId, setAudienceId] = useState(NONE);
  const [offerId, setOfferId] = useState(NONE);

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Podaj nazwę kampanii");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || undefined,
          channel,
          status,
          audienceId: audienceId === NONE ? undefined : audienceId,
          offerId: offerId === NONE ? undefined : offerId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kampania utworzona");
      setName("");
      setGoal("");
      setChannel("EMAIL");
      setStatus("DRAFT");
      setAudienceId(NONE);
      setOfferId(NONE);
      setOpen(false);
      onCreated();
    } catch {
      toast.error("Nie udało się utworzyć kampanii");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Nowa kampania
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowa kampania</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nazwa</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Outreach Q3 — firmy produkcyjne"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-goal">Cel</Label>
            <Textarea
              id="c-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Umówić 10 rozmów wstępnych ze średnimi firmami produkcyjnymi"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kanał</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as CampaignChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Grupa docelowa</Label>
              <Select value={audienceId} onValueChange={setAudienceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcjonalnie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Brak</SelectItem>
                  {audiences.map((au) => (
                    <SelectItem key={au.id} value={au.id}>
                      {au.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Oferta</Label>
              <Select value={offerId} onValueChange={setOfferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcjonalnie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Brak</SelectItem>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Utwórz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
