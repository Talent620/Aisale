"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Manage public-API keys + show the integration URLs (REST, ICS, landing). */
export function ApiAccessCard({
  keys,
  appUrl,
  inboundToken,
  landingSlug,
}: {
  keys: ApiKeyRow[];
  appUrl: string;
  inboundToken: string;
  landingSlug: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function createKey() {
    if (name.trim().length < 2) {
      toast.error("Name the key (e.g. 'Zapier')");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { plaintext?: string; error?: string };
      if (!res.ok || !data.plaintext) throw new Error(data.error);
      setFreshKey(data.plaintext);
      setName("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Could not create the key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Key revoked");
      router.refresh();
    } catch {
      toast.error("Could not revoke the key");
    } finally {
      setBusy(false);
    }
  }

  const urls = [
    { tag: "rest", label: "REST API", value: `${appUrl}/api/v1/leads` },
    { tag: "ics", label: "Calendar feed (ICS)", value: `${appUrl}/api/calendar/ics?token=${inboundToken}` },
    ...(landingSlug
      ? [{ tag: "landing", label: "Public landing page", value: `${appUrl}/l/${landingSlug}` }]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> API access &amp; integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          {urls.map((u) => (
            <div key={u.tag} className="flex items-center gap-2 text-sm">
              <span className="w-44 shrink-0 text-muted-foreground">{u.label}</span>
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{u.value}</code>
              <Button variant="ghost" size="sm" onClick={() => copy(u.value, u.tag)}>
                {copied === u.tag ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            REST: send <code>Authorization: Bearer &lt;key&gt;</code> · GET lists leads, POST creates
            them. ICS: subscribe in Google&nbsp;Calendar/Outlook (tasks + scheduled calls).
          </p>
        </div>

        {freshKey ? (
          <div className="space-y-2 rounded-md border border-success/30 bg-success/5 p-3">
            <p className="text-sm font-medium text-success">Key created — copy it now, it won&apos;t be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">{freshKey}</code>
              <Button variant="outline" size="sm" onClick={() => copy(freshKey, "fresh")}>
                {copied === "fresh" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {k.name}
                  {k.revokedAt ? <Badge variant="secondary">revoked</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {k.prefix}… · created {format(new Date(k.createdAt), "d MMM yyyy")}
                  {k.lastUsedAt ? ` · last used ${format(new Date(k.lastUsedAt), "d MMM yyyy")}` : " · never used"}
                </p>
              </div>
              {!k.revokedAt ? (
                <Button variant="ghost" size="sm" onClick={() => revoke(k.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. Zapier, my script)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={createKey} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create key
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
