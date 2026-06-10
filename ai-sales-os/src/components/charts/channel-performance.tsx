"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins, Loader2 } from "lucide-react";
import type { LeadSource } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";

export interface ChannelRow {
  source: LeadSource;
  leads: number;
  won: number;
  conversion: number; // 0..1
  cost: number; // total spend in the window
  cpl: number | null;
  costPerWon: number | null;
}

const SOURCES = Object.keys(LEAD_SOURCE_LABELS) as LeadSource[];

function money(n: number | null, currency: string): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString()} ${currency}`;
}

/**
 * Channel effectiveness: leads, conversion, spend, CPL and cost-per-won per
 * acquisition source (last 90 days), plus an inline editor for monthly spend.
 */
export function ChannelPerformance({
  rows,
  currency,
}: {
  rows: ChannelRow[];
  currency: string;
}) {
  const router = useRouter();
  const [source, setSource] = useState<LeadSource>("ADS");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveCost() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter the spend amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, month, amount: Math.round(value) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Channel spend saved");
      setAmount("");
      router.refresh();
    } catch {
      toast.error("Could not save the spend");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4" /> Channel performance — last 90 days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Channel</th>
                <th className="py-2 pr-3 text-right font-medium">Leads</th>
                <th className="py-2 pr-3 text-right font-medium">Won</th>
                <th className="py-2 pr-3 text-right font-medium">Conversion</th>
                <th className="py-2 pr-3 text-right font-medium">Spend</th>
                <th className="py-2 pr-3 text-right font-medium">CPL</th>
                <th className="py-2 text-right font-medium">Cost / won</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No lead data in this window yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.source} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{LEAD_SOURCE_LABELS[r.source]}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{r.leads}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{r.won}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {(r.conversion * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(r.cost || null, currency)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{money(r.cpl, currency)}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(r.costPerWon, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Channel</p>
            <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Month</p>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Spend ({currency})</p>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
              className="w-32"
            />
          </div>
          <Button size="sm" onClick={saveCost} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save spend
          </Button>
          <p className="basis-full text-[11px] text-muted-foreground">
            Enter what you spend per channel monthly (ads, tools, time) — CPL and cost-per-won update
            instantly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
