"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Phone, Loader2 } from "lucide-react";
import type { CallStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALL_STATUS_META } from "@/lib/constants";

export interface CallLogView {
  id: string;
  status: CallStatus;
  note: string | null;
  createdAt: string;
  userName: string | null;
}

const LOG_STATUSES: CallStatus[] = [
  "NO_ANSWER",
  "VOICEMAIL",
  "CALLBACK",
  "INTERESTED",
  "NOT_INTERESTED",
  "MEETING_BOOKED",
  "WRONG_NUMBER",
];

export function CallPanel({
  leadId,
  phone,
  callStatus,
  calls,
}: {
  leadId: string;
  phone: string | null;
  callStatus: CallStatus;
  calls: CallLogView[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [note, setNote] = useState("");
  const [nextCallAt, setNextCallAt] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = CALL_STATUS_META[callStatus];

  async function save() {
    if (!status) {
      toast.error("Wybierz wynik rozmowy");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: note.trim() || undefined,
          nextCallAt: nextCallAt ? new Date(nextCallAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Rozmowa zapisana");
      setStatus(null);
      setNote("");
      setNextCallAt("");
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać rozmowy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Telefony
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
        </CardTitle>
        {phone ? (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${phone.replace(/\s+/g, "")}`}>
              <Phone className="h-4 w-4" /> Zadzwoń {phone}
            </a>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {phone ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap gap-2">
              {LOG_STATUSES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={status === s ? "default" : "outline"}
                  onClick={() => setStatus(s)}
                >
                  {CALL_STATUS_META[s].label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="call-note">Notatka — gdzie stanęła rozmowa, co wiesz?</Label>
                <Textarea
                  id="call-note"
                  rows={2}
                  placeholder="np. Rozmowa z właścicielem — chce audyt mailem, oddzwonić w piątek…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="call-next">Następny telefon</Label>
                <Input
                  id="call-next"
                  type="datetime-local"
                  value={nextCallAt}
                  onChange={(e) => setNextCallAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Zapisz rozmowę
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ten lead nie ma numeru telefonu.</p>
        )}

        {calls.length > 0 ? (
          <div className="space-y-2">
            {calls.map((c) => (
              <div key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={CALL_STATUS_META[c.status].className}>
                    {CALL_STATUS_META[c.status].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.userName ? `${c.userName} · ` : ""}
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {c.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{c.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
