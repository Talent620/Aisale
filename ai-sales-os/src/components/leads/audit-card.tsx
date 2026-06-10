"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Gauge, Loader2, RefreshCw, ShieldAlert, Smartphone, GlobeLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface AuditView {
  overall: number;
  https: boolean;
  mobileFriendly: boolean | null;
  performance: number | null;
  seo: number | null;
  loadTimeMs: number | null;
  issues: string[];
  opportunities: string[];
  summary: string | null;
  provider: string;
  createdAt: string;
}

export function AuditCard({
  leadId,
  website,
  hasWebsite,
  audit,
}: {
  leadId: string;
  website: string | null;
  hasWebsite: boolean | null;
  audit: AuditView | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function runAudit() {
    setRunning(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/audit`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Audyt nie powiódł się");
      }
      toast.success("Strona zaudytowana");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audyt nie powiódł się");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Audyt strony WWW
        </CardTitle>
        {website ? (
          <Button variant="outline" size="sm" onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {audit ? "Powtórz" : "Audytuj"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!website ? (
          <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/5 p-3">
            <GlobeLock className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-sm">
              <span className="font-medium text-success">Brak strony{hasWebsite === false ? " (zweryfikowano)" : " w danych"}.</span>{" "}
              To Twój najmocniejszy argument: są niewidoczni dla szukających klientów.
            </p>
          </div>
        ) : !audit ? (
          <p className="text-sm text-muted-foreground">
            Jeszcze nie audytowano. Odpal audyt, a dostaniesz konkrety do rozmowy (szybkość, HTTPS, mobile, SEO).
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-semibold tabular-nums">
                {audit.overall}
                <span className="text-base text-muted-foreground">/100</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {!audit.https ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <ShieldAlert className="mr-1 h-3 w-3" /> Brak HTTPS
                  </Badge>
                ) : null}
                {audit.mobileFriendly === false ? (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    <Smartphone className="mr-1 h-3 w-3" /> Nie działa na mobile
                  </Badge>
                ) : null}
                {audit.loadTimeMs != null ? (
                  <Badge variant="secondary">{(audit.loadTimeMs / 1000).toFixed(1)} s ładowania</Badge>
                ) : null}
              </div>
            </div>
            <Progress value={audit.overall} className="h-1.5" />
            {audit.summary ? <p className="text-sm text-muted-foreground">{audit.summary}</p> : null}
            {audit.issues.length ? (
              <ul className="space-y-1">
                {audit.issues.map((i) => (
                  <li key={i} className="text-sm text-warning">
                    • {i}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {audit.provider === "pagespeed" ? "Google PageSpeed" : "Sonda heurystyczna"} ·{" "}
              {formatDistanceToNow(new Date(audit.createdAt), { addSuffix: true })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
