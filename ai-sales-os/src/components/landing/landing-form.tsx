"use client";

import { useState } from "react";
import { Loader2, Send, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Public landing-page form → POST /api/public/leads (honeypot + consent). */
export function LandingForm({
  token,
  consentSource,
  companyName,
}: {
  token: string;
  consentSource: string;
  companyName: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() && !email.trim() && !phone.trim()) {
      setError("Leave at least your name, email or phone so we can reach you.");
      return;
    }
    if (!consent) {
      setError("Please agree to be contacted — we can't reply otherwise.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Ingest-Token": token },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          sourceDetail: consentSource,
          marketingConsent: true,
          consentSource,
          _hp: hp,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Something went wrong — please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <PartyPopper className="h-10 w-10 text-success" />
        <p className="font-display text-lg font-semibold">Thank you!</p>
        <p className="text-sm text-muted-foreground">
          Your message reached {companyName}. We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Honeypot — hidden from humans, bots fill it in. */}
      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      <div className="space-y-1.5">
        <Label htmlFor="lf-name">Name</Label>
        <Input id="lf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lf-email">Email</Label>
          <Input id="lf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@firma.pl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-phone">Phone</Label>
          <Input id="lf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 600 000 000" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lf-msg">What do you need? (optional)</Label>
        <Textarea id="lf-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us briefly about your business…" />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree to be contacted by {companyName} by email or phone about my enquiry, and to the
          processing of my data for this purpose (GDPR). The consent source and time are recorded.
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send — get the free consultation
      </Button>
    </form>
  );
}
