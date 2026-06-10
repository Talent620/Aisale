"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Magnet,
  Webhook,
  Copy,
  Check,
  Radar,
  Loader2,
  Globe,
  Inbox,
  Search,
  Zap,
  Power,
  Gauge,
  Clock,
  Send,
  Users,
  Play,
  GitBranch,
  Star,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { CampaignChannel, ContentKind, LeadSource, ScoreGrade } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";
import { SourceBadge } from "@/components/status-badges";
import { cn } from "@/lib/utils";

const AUTO = "AUTO";
const WEBHOOK_PROVIDERS = ["meta", "google", "typeform", "tally", "calendly", "zapier"];
const CHANNEL_OPTIONS: CampaignChannel[] = ["EMAIL", "LINKEDIN", "FACEBOOK", "INSTAGRAM", "COLD_CALL"];
const CHANNEL_LABEL: Partial<Record<CampaignChannel, string>> = {
  EMAIL: "e-mail",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  COLD_CALL: "zimny telefon",
};

interface Audience {
  id: string;
  name: string;
  industry: string | null;
  region: string | null;
}

interface RecentLead {
  id: string;
  name: string;
  companyName: string | null;
  source: LeadSource;
  score: number;
  grade: ScoreGrade;
  createdAt: string;
}

export interface AutopilotSettings {
  enabled: boolean;
  cadenceMinutes: number;
  dailyLeadCap: number;
  targetPerDay: number;
  perRunBatch: number;
  autoDraftInbound: boolean;
  autoDraftOutbound: boolean;
  autoEnroll: boolean;
  enrichLeads: boolean;
  minScoreToDraft: number;
  channels: string[];
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  autoSendEmails: boolean;
  dailyEmailCap: number;
  auditWebsites: boolean;
  lastRunAt: string | null;
}

export interface RunRow {
  id: string;
  trigger: string;
  status: string;
  discovered: number;
  created: number;
  deduped: number;
  enriched: number;
  drafted: number;
  enrolled: number;
  advanced: number;
  hotDetected: number;
  durationMs: number;
  error: string | null;
  createdAt: string;
  detail: { reason?: string; live?: boolean } | null;
}

export interface SequenceStepRow {
  id: string;
  order: number;
  dayOffset: number;
  channel: CampaignChannel;
  kind: ContentKind;
  name: string;
}

export interface SequenceRow {
  id: string;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  active: boolean;
  isDefault: boolean;
  steps: SequenceStepRow[];
  activeEnrollments: number;
  enrollments: number;
}

interface Stats {
  capturedToday: number;
  pendingApprovals: number;
  activeEnrollments: number;
  inbound: number;
  outbound: number;
}

export function AcquisitionClient({
  token,
  autoDraft: initialAutoDraft,
  baseUrl,
  audiences,
  provider,
  recent,
  settings,
  runs,
  sequences,
  stats,
}: {
  token: string;
  autoDraft: boolean;
  baseUrl: string;
  audiences: Audience[];
  provider: { name: string; live: boolean };
  recent: RecentLead[];
  settings: AutopilotSettings;
  runs: RunRow[];
  sequences: SequenceRow[];
  stats: Stats;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState(baseUrl);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!baseUrl && typeof window !== "undefined") setOrigin(window.location.origin);
  }, [baseUrl]);

  const captureUrl = `${origin || "https://your-app.example"}/api/public/leads`;

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    try {
      const res = await fetch("/api/acquisition/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Autopilot włączony — będzie pozyskiwać i tworzyć szkice według harmonogramu" : "Autopilot wstrzymany");
      router.refresh();
    } catch {
      setEnabled(!next);
      toast.error("Nie udało się zaktualizować autopilota");
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/acquisition/run", { method: "POST" });
      if (!res.ok) throw new Error();
      const r: {
        status: string;
        created: number;
        drafted: number;
        enrolled: number;
        advanced: number;
        skippedReason?: string;
      } = await res.json();
      if (r.status === "SKIPPED") {
        toast.info(`Pominięto — ${r.skippedReason ?? "w tej chwili nic do zrobienia"}`);
      } else {
        const bits = [
          r.created ? `${r.created} nowych` : "",
          r.drafted ? `${r.drafted} szkiców` : "",
          r.enrolled ? `${r.enrolled} zapisanych do sekwencji` : "",
          r.advanced ? `${r.advanced} przesuniętych dalej` : "",
        ].filter(Boolean);
        toast.success(bits.length ? `Autopilot: ${bits.join(" · ")}` : "Autopilot zakończył przebieg — tym razem nic nowego");
      }
      router.refresh();
    } catch {
      toast.error("Uruchomienie nie powiodło się");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autopilot pozyskiwania"
        description="Samosterujący silnik, który pozyskuje potencjalnych klientów z Twojego ICP, wzbogaca ich dane i każdy kontakt przygotowuje jako szkic w Akceptacjach — według harmonogramu. Nic nie zostanie wysłane bez Ciebie."
      >
        <StatusPill enabled={enabled} live={provider.live} />
        <Button onClick={runNow} disabled={running}>
          {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
          Uruchom teraz
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Magnet}
          label="Pozyskane dzisiaj"
          value={`${stats.capturedToday}/${settings.dailyLeadCap}`}
          sub={`cel ${settings.targetPerDay}/dzień`}
        />
        <StatTile icon={Send} label="Szkice do przeglądu" value={stats.pendingApprovals} sub="w Akceptacjach" accent={stats.pendingApprovals > 0} />
        <StatTile icon={Users} label="W sekwencjach" value={stats.activeEnrollments} sub="aktywne zapisy" />
        <NextRunTile enabled={enabled} lastRunAt={settings.lastRunAt} cadenceMinutes={settings.cadenceMinutes} />
      </div>

      <Tabs defaultValue="autopilot" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
          <TabsTrigger value="sequences">
            Sekwencje
            {sequences.length ? <span className="ml-1.5 text-xs text-muted-foreground">{sequences.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="inbound">Przychodzące</TabsTrigger>
          <TabsTrigger value="outbound">Wychodzące</TabsTrigger>
        </TabsList>

        <TabsContent value="autopilot" className="space-y-5">
          <EnginePanel enabled={enabled} onToggle={toggleEnabled} settings={settings} onSaved={() => router.refresh()} />
          <RunsFeed runs={runs} />
          <RecentlyCaptured recent={recent} />
        </TabsContent>

        <TabsContent value="sequences" className="space-y-5">
          <SequencesPanel sequences={sequences} onChange={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="inbound" className="space-y-5">
          <InboundCard
            token={token}
            captureUrl={captureUrl}
            origin={origin || "https://your-app.example"}
            initialAutoDraft={initialAutoDraft}
            baseUrlMissing={!baseUrl}
          />
        </TabsContent>

        <TabsContent value="outbound" className="space-y-5">
          <OutboundCard audiences={audiences} provider={provider} onDone={() => router.refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------- Status bits ------------------------------ */

function StatusPill({ enabled, live }: { enabled: boolean; live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        enabled
          ? "border-success/20 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span className="relative flex h-2 w-2">
        {enabled ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        ) : null}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", enabled ? "bg-success" : "bg-muted-foreground/50")} />
      </span>
      {enabled ? "Autopilot aktywny" : "Autopilot wstrzymany"}
      {!live ? <span className="opacity-60">· dane przykładowe</span> : null}
    </span>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
          {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
        <span className={cn("rounded-md p-1.5", accent ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function NextRunTile({
  enabled,
  lastRunAt,
  cadenceMinutes,
}: {
  enabled: boolean;
  lastRunAt: string | null;
  cadenceMinutes: number;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  let label = "—";
  if (enabled) {
    if (!lastRunAt) label = "wkrótce";
    else {
      const next = new Date(new Date(lastRunAt).getTime() + cadenceMinutes * 60_000);
      label = next.getTime() <= Date.now() ? "lada moment" : formatDistanceToNow(next, { addSuffix: true, locale: pl });
    }
  }
  return <StatTile icon={Clock} label="Następny przebieg" value={label} sub={enabled ? `co ${cadenceMinutes} min` : "wstrzymany"} />;
}

/* ------------------------------ Engine panel ------------------------------ */

function EnginePanel({
  enabled,
  onToggle,
  settings,
  onSaved,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  settings: AutopilotSettings;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof AutopilotSettings>(key: K, value: AutopilotSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const { lastRunAt: _omit, enabled: _omit2, ...payload } = form;
      void _omit;
      void _omit2;
      const res = await fetch("/api/acquisition/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Ustawienia autopilota zapisane");
      onSaved();
    } catch {
      toast.error("Nie udało się zapisać ustawień");
    } finally {
      setSaving(false);
    }
  }

  const hourOptions = ["off", ...Array.from({ length: 24 }, (_, i) => String(i))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" /> Silnik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master switch */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 rounded-md p-2", enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
              <Power className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Autonomiczne pozyskiwanie</p>
              <p className="text-xs text-muted-foreground">
                Po włączeniu silnik pozyskuje, wzbogaca, zapisuje do sekwencji i tworzy szkice według harmonogramu. Wszystko trafia do Akceptacji.
              </p>
            </div>
          </div>
          <Toggle checked={enabled} onChange={onToggle} />
        </div>

        {/* Pacing */}
        <div>
          <SectionLabel icon={Gauge}>Tempo i limity</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Uruchamiaj co (min)" value={form.cadenceMinutes} min={5} max={1440} onChange={(v) => set("cadenceMinutes", v)} />
            <NumberField label="Dzienny limit leadów" value={form.dailyLeadCap} min={0} max={1000} onChange={(v) => set("dailyLeadCap", v)} />
            <NumberField label="Cel / dzień" value={form.targetPerDay} min={0} max={1000} onChange={(v) => set("targetPerDay", v)} />
            <NumberField label="Na ICP / przebieg" value={form.perRunBatch} min={1} max={100} onChange={(v) => set("perRunBatch", v)} />
          </div>
        </div>

        {/* Behaviour */}
        <div>
          <SectionLabel icon={ShieldCheck}>Zachowanie (człowiek w pętli)</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              label="Automatyczne szkice odpowiedzi przychodzących"
              hint="Pierwsza odpowiedź AI dla leadów przychodzących → Akceptacje"
              checked={form.autoDraftInbound}
              onChange={(v) => set("autoDraftInbound", v)}
            />
            <ToggleRow
              label="Automatyczne szkice pierwszego kontaktu wychodzącego"
              hint="Używane, gdy automatyczny zapis do sekwencji jest wyłączony"
              checked={form.autoDraftOutbound}
              onChange={(v) => set("autoDraftOutbound", v)}
            />
            <ToggleRow
              label="Automatycznie zapisuj do kadencji"
              hint="Nowe leady dołączają do domyślnej sekwencji"
              checked={form.autoEnroll}
              onChange={(v) => set("autoEnroll", v)}
            />
            <ToggleRow
              label="Wzbogacaj nowe leady"
              hint="Ustal stronę WWW, wartość i przelicz scoring"
              checked={form.enrichLeads}
              onChange={(v) => set("enrichLeads", v)}
            />
            <ToggleRow
              label="Audytuj strony leadów"
              hint="Analiza PageSpeed/heurystyczna zasila spersonalizowane szkice"
              checked={form.auditWebsites}
              onChange={(v) => set("auditWebsites", v)}
            />
            <ToggleRow
              label="Automatyczna wysyłka e-maili"
              hint="Pełna automatyzacja: szkice AI są wysyłane bez przeglądu"
              checked={form.autoSendEmails}
              onChange={(v) => set("autoSendEmails", v)}
            />
          </div>
          {form.autoSendEmails ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Dzienny limit e-maili" value={form.dailyEmailCap} min={0} max={500} onChange={(v) => set("dailyEmailCap", v)} />
            </div>
          ) : null}
        </div>

        {/* Quiet hours + channels */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <SectionLabel icon={Clock}>Godziny ciszy (czas lokalny)</SectionLabel>
            <div className="flex items-center gap-2">
              <HourSelect
                value={form.quietHoursStart}
                options={hourOptions}
                onChange={(v) => set("quietHoursStart", v)}
              />
              <span className="text-sm text-muted-foreground">→</span>
              <HourSelect
                value={form.quietHoursEnd}
                options={hourOptions}
                onChange={(v) => set("quietHoursEnd", v)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">W tym oknie nie powstają nowe szkice kontaktu.</p>
          </div>

          <div className="space-y-1.5">
            <SectionLabel icon={Send}>Kanały kontaktu</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => {
                const on = form.channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {CHANNEL_LABEL[ch] ?? ch.toLowerCase().replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Zapisz ustawienia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular-nums"
      />
    </div>
  );
}

function HourSelect({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: string[];
  onChange: (v: number | null) => void;
}) {
  return (
    <Select
      value={value == null ? "off" : String(value)}
      onValueChange={(v) => onChange(v === "off" ? null : Number(v))}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o === "off" ? "Wył." : `${o.padStart(2, "0")}:00`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-success" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ------------------------------- Runs feed -------------------------------- */

const RUN_STATUS_CLASS: Record<string, string> = {
  SUCCESS: "bg-success/10 text-success border-success/20",
  PARTIAL: "bg-warning/10 text-warning border-warning/20",
  SKIPPED: "bg-muted text-muted-foreground border-border",
  ERROR: "bg-destructive/10 text-destructive border-destructive/20",
};

const RUN_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "sukces",
  PARTIAL: "częściowo",
  SKIPPED: "pominięto",
  ERROR: "błąd",
};

const TRIGGER_LABEL: Record<string, string> = {
  CRON: "harmonogram",
  MANUAL: "ręcznie",
  STARTUP: "start aplikacji",
};

function RunsFeed({ runs }: { runs: RunRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4" /> Aktywność
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Brak przebiegów. Kliknij „Uruchom teraz” albo poczekaj na następny zaplanowany przebieg.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {runs.map((r) => {
              const counts =
                r.status === "SKIPPED"
                  ? r.detail?.reason ?? "pominięto"
                  : [
                      r.created ? `+${r.created} leadów` : "",
                      r.deduped ? `${r.deduped} dupl.` : "",
                      r.enriched ? `${r.enriched} wzbogaconych` : "",
                      r.drafted ? `${r.drafted} szkiców` : "",
                      r.enrolled ? `${r.enrolled} zapisanych` : "",
                      r.advanced ? `${r.advanced} przesuniętych` : "",
                      r.hotDetected ? `${r.hotDetected} gorących` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "nic nowego";
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", RUN_STATUS_CLASS[r.status] ?? RUN_STATUS_CLASS.SKIPPED)}>
                      {RUN_STATUS_LABEL[r.status] ?? r.status.toLowerCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.error ? <span className="text-destructive">{r.error}</span> : counts}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {TRIGGER_LABEL[r.trigger] ?? r.trigger.toLowerCase()} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: pl })}
                        {r.durationMs ? ` · ${(r.durationMs / 1000).toFixed(1)}s` : ""}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Sequences --------------------------------- */

function SequencesPanel({ sequences, onChange }: { sequences: SequenceRow[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function patch(id: string, body: Record<string, unknown>, msg: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(msg);
      onChange();
    } catch {
      toast.error("Aktualizacja nie powiodła się");
    } finally {
      setBusy(null);
    }
  }

  async function enroll(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/sequences/${id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eligible: true }),
      });
      if (!res.ok) throw new Error();
      const r: { enrolled: number } = await res.json();
      toast.success(r.enrolled ? `Zapisano do sekwencji ${r.enrolled} kwalifikujących się leadów` : "Brak kwalifikujących się leadów do zapisania");
      onChange();
    } catch {
      toast.error("Zapis do sekwencji nie powiódł się");
    } finally {
      setBusy(null);
    }
  }

  async function create(isDefault: boolean) {
    if (!name.trim()) {
      toast.error("Nadaj kadencji nazwę");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isDefault }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kadencja utworzona z domyślnymi 4 krokami kontaktu");
      setName("");
      onChange();
    } catch {
      toast.error("Nie udało się utworzyć kadencji");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" /> Kadencje kontaktu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kadencja to sekwencja wielu punktów kontaktu. Gdy nadchodzi termin kroku, autopilot pisze treść i ustawia ją
            w kolejce Akceptacji — Ty zatwierdzasz, potem wysyłasz. Leady są automatycznie zapisywane do kadencji <span className="font-medium">domyślnej</span>.
          </p>

          {sequences.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Brak kadencji. Utwórz nową poniżej — zostanie wypełniona sprawdzonym domyślnym schematem 4 kontaktów.
            </p>
          ) : (
            <ul className="space-y-3">
              {sequences.map((s) => (
                <li key={s.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        {s.isDefault ? (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" /> domyślna
                          </Badge>
                        ) : null}
                        <Badge variant={s.active ? "success" : "outline"}>{s.active ? "aktywna" : "wstrzymana"}</Badge>
                      </div>
                      {s.description ? <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {s.activeEnrollments} aktywnych · {s.enrollments} zapisanych łącznie
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle checked={s.active} disabled={busy === s.id} onChange={(v) => patch(s.id, { active: v }, v ? "Kadencja wznowiona" : "Kadencja wstrzymana")} />
                      {!s.isDefault ? (
                        <Button variant="outline" size="sm" disabled={busy === s.id} onClick={() => patch(s.id, { isDefault: true }, "Ustawiono jako kadencję domyślną")}>
                          Ustaw jako domyślną
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" disabled={busy === s.id} onClick={() => enroll(s.id)}>
                        {busy === s.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Users className="mr-1.5 h-3.5 w-3.5" />}
                        Zapisz kwalifikujące się
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.steps.map((st) => (
                      <StepPill key={st.id} step={st} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
            <Input
              placeholder="Nazwa nowej kadencji (np. Producenci Q3)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button variant="outline" disabled={creating} onClick={() => create(false)}>
                {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                Utwórz kadencję
              </Button>
              {sequences.every((s) => !s.isDefault) ? (
                <Button disabled={creating} onClick={() => create(true)}>
                  Utwórz jako domyślną
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const KIND_LABEL: Partial<Record<ContentKind, string>> = {
  EMAIL: "E-mail",
  DM: "DM",
  FOLLOW_UP: "Follow-up",
  AD: "Reklama",
  POST: "Post",
  OFFER: "Oferta",
  SUBJECT_LINE: "Temat",
  COLD_CALL_SCRIPT: "Telefon",
};

function StepPill({ step }: { step: SequenceStepRow }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px]">
      <span className="font-semibold text-foreground">{step.order}</span>
      <span className="text-muted-foreground">
        D{step.dayOffset === 0 ? "0" : `+${step.dayOffset}`} · {KIND_LABEL[step.kind] ?? step.kind} · {CHANNEL_LABEL[step.channel] ?? step.channel.toLowerCase()}
      </span>
    </span>
  );
}

/* ---------------------------- Recently captured --------------------------- */

function RecentlyCaptured({ recent }: { recent: RecentLead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ostatnio pozyskane</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Brak automatycznie pozyskanych leadów. Podepnij formularz/webhook albo pozwól autopilotowi znaleźć kilka.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:underline">
                    {l.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.companyName ?? "—"} · {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true, locale: pl })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourceBadge source={l.source} />
                  <ScoreBadge score={l.score} grade={l.grade} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Shared bits ------------------------------- */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Kopiowanie nie powiodło się");
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {label ?? (copied ? "Skopiowano" : "Kopiuj")}
    </Button>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> {title}
        </Label>
        <CopyButton text={code} />
      </div>
      <pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-[11px] leading-relaxed scroll-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InboundCard({
  token,
  captureUrl,
  origin,
  initialAutoDraft,
  baseUrlMissing,
}: {
  token: string;
  captureUrl: string;
  origin: string;
  initialAutoDraft: boolean;
  baseUrlMissing: boolean;
}) {
  const [autoDraft, setAutoDraft] = useState(initialAutoDraft);
  const [saving, setSaving] = useState(false);

  async function toggleAutoDraft(next: boolean) {
    setAutoDraft(next);
    setSaving(true);
    try {
      const res = await fetch("/api/acquisition/inbound", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoDraft: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "AI przygotuje szkic pierwszej odpowiedzi dla nowych leadów" : "Automatyczne szkice wyłączone");
    } catch {
      setAutoDraft(!next);
      toast.error("Nie udało się zaktualizować ustawienia");
    } finally {
      setSaving(false);
    }
  }

  const curl = `curl -X POST ${captureUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Ingest-Token: ${token}" \\
  -d '{"name":"Jan Kowalski","email":"jan@firma.pl","message":"Proszę o kontakt"}'`;

  const html = `<form id="lead">
  <input name="name" placeholder="Imię i nazwisko" />
  <input name="email" type="email" placeholder="E-mail" />
  <textarea name="message" placeholder="Wiadomość"></textarea>
  <input name="_hp" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Wyślij</button>
</form>
<script>
  lead.onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(lead));
    await fetch("${captureUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Ingest-Token": "${token}" },
      body: JSON.stringify(f),
    });
    lead.reset();
  };
</script>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="h-4 w-4" /> Przychodzące — leady przychodzą do Ciebie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Skieruj dowolny formularz na stronie, landing page lub reklamę leadową na poniższy endpoint. Leady są
          automatycznie deduplikowane, oceniane i przypisywane.
        </p>

        {baseUrlMissing ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            Poniższe adresy URL korzystają z bieżącego adresu przeglądarki. Ustaw <code>NEXTAUTH_URL</code> na
            domenę produkcyjną, aby były gotowe do wklejenia wszędzie.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label>Endpoint przechwytywania</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={captureUrl} className="font-mono text-xs" />
            <CopyButton text={captureUrl} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Token przechwytywania (nagłówek <code>X-Ingest-Token</code>)</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={token} className="font-mono text-xs" />
            <CopyButton text={token} />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border border-border p-3">
          <input
            type="checkbox"
            checked={autoDraft}
            disabled={saving}
            onChange={(e) => toggleAutoDraft(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span className="text-sm">
            <span className="font-medium">Automatyczny szkic pierwszej odpowiedzi z AI</span>
            <span className="block text-xs text-muted-foreground">
              Każdy nowy lead otrzymuje przygotowany przez AI szkic pierwszej odpowiedzi w kolejce Akceptacji
              (nigdy nie jest wysyłany automatycznie).
            </span>
          </span>
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <Snippet title="Gotowy formularz HTML" code={html} />
          <Snippet title="Serwer / cURL" code={curl} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Adresy webhooków</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Wklej w Meta Lead Ads, Google Lead Forms, Typeform, Tally, Calendly, Zapier/Make.
          </p>
          <div className="space-y-2">
            {WEBHOOK_PROVIDERS.map((p) => {
              const url = `${origin}/api/webhooks/${p}?token=${token}`;
              return (
                <div key={p} className="flex items-center gap-2">
                  <Badge variant="outline" className="w-24 justify-center capitalize">
                    {p}
                  </Badge>
                  <Input readOnly value={url} className="font-mono text-[11px]" />
                  <CopyButton text={url} label="" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OutboundCard({
  audiences,
  provider,
  onDone,
}: {
  audiences: Audience[];
  provider: { name: string; live: boolean };
  onDone: () => void;
}) {
  const [audienceId, setAudienceId] = useState(AUTO);
  const [limit, setLimit] = useState("10");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/acquisition/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceId: audienceId === AUTO ? undefined : audienceId,
          limit: Number(limit) || 10,
        }),
      });
      if (!res.ok) throw new Error();
      const data: { created: number; deduped: number; found: number; live: boolean } = await res.json();
      if (data.created === 0 && data.found === 0) {
        toast.info("Brak potencjalnych klientów dla tego ICP.");
      } else {
        toast.success(
          `Dodano ${data.created} ${data.created === 1 ? "nowy lead" : "nowych leadów"}${data.deduped ? ` · pominięto duplikaty: ${data.deduped}` : ""}`,
        );
        onDone();
      }
    } catch {
      toast.error("Wyszukiwanie nie powiodło się");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4" /> Wychodzące — znajdź potencjalnych klientów z ICP
          <Badge variant={provider.live ? "success" : "warning"} className="ml-1">
            {provider.live ? provider.name : "dane przykładowe"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pobiera świeżych potencjalnych klientów pasujących do ICP, a następnie deduplikuje ich, ocenia i przypisuje
          jako nowe leady. {provider.live ? null : "Obecnie używane są przykładowe dane — "}
          {provider.live ? (
            <>Połączono ze źródłem na żywo.</>
          ) : (
            <>
              ustaw <code>APOLLO_API_KEY</code> lub <code>HUNTER_API_KEY</code>, aby pozyskiwać prawdziwe dane.
            </>
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>ICP / grupa docelowa</Label>
            <Select value={audienceId} onValueChange={setAudienceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Główny ICP (auto)</SelectItem>
                {audiences.map((au) => (
                  <SelectItem key={au.id} value={au.id}>
                    {au.name}
                    {au.industry ? ` · ${au.industry}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-limit">Ile</Label>
            <Input
              id="d-limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-24"
            />
          </div>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
            Uruchom wyszukiwanie
          </Button>
        </div>

        {audiences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Wskazówka: utwórz grupę docelową, aby doprecyzować targetowanie — wyszukiwanie zadziała też
            z rozsądnymi ustawieniami domyślnymi.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
