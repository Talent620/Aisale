import { LeadOutcome, type Lead, type FunnelStage } from "@prisma/client";

export type NextActionType =
  | "FIRST_TOUCH"
  | "FOLLOW_UP"
  | "QUALIFY"
  | "SEND_PROPOSAL"
  | "CLOSE"
  | "RE_ENGAGE"
  | "NURTURE";

export interface NextAction {
  type: NextActionType;
  label: string;
  rationale: string;
  urgency: "high" | "medium" | "low";
  /** Suggested AI content kind to draft, if any. */
  draftKind?: "EMAIL" | "FOLLOW_UP" | "OFFER" | "DM";
}

type LeadLike = Lead & { stage?: Pick<FunnelStage, "name" | "isWon" | "isLost"> | null };

const DAY = 86_400_000;

/**
 * Heuristic "next best action" recommender. Pure + deterministic so it can run
 * on the server (lists, dashboard) and be unit-tested. The AI Copilot can layer
 * richer reasoning on top, but this guarantees a sensible default everywhere.
 */
export function nextBestAction(lead: LeadLike): NextAction {
  const now = Date.now();
  const stage = lead.stage?.name?.toLowerCase() ?? "";
  const daysSinceContact = lead.lastContactedAt
    ? (now - new Date(lead.lastContactedAt).getTime()) / DAY
    : Infinity;

  if (lead.outcome === LeadOutcome.WON || lead.stage?.isWon) {
    return {
      type: "NURTURE",
      label: "Poproś o polecenie / zaproponuj upsell",
      rationale: "Transakcja wygrana — to najlepszy moment, by poprosić o polecenie lub zaproponować wyższy pakiet.",
      urgency: "low",
      draftKind: "EMAIL",
    };
  }

  if (lead.outcome === LeadOutcome.LOST || lead.stage?.isLost) {
    return {
      type: "RE_ENGAGE",
      label: "Zaplanuj powrót do kontaktu za 60 dni",
      rationale: "Transakcja przegrana — odłóż ją i wróć później z nowym podejściem.",
      urgency: "low",
    };
  }

  if (!lead.lastContactedAt) {
    return {
      type: "FIRST_TOUCH",
      label: "Wyślij pierwszą wiadomość",
      rationale: "Brak odnotowanego kontaktu. Rozpocznij rozmowę, póki lead jest świeży.",
      urgency: lead.score >= 60 ? "high" : "medium",
      draftKind: "EMAIL",
    };
  }

  if (stage.includes("proposal") || stage.includes("negotiation")) {
    return {
      type: "CLOSE",
      label: "Domknij follow-upem",
      rationale: "Końcowy etap transakcji — doprowadź do decyzji, zanim impet osłabnie.",
      urgency: "high",
      draftKind: "FOLLOW_UP",
    };
  }

  if (stage.includes("qualified")) {
    return {
      type: "SEND_PROPOSAL",
      label: "Wyślij dopasowaną ofertę",
      rationale: "Lead jest zakwalifikowany — zamień zainteresowanie w konkretną propozycję.",
      urgency: "high",
      draftKind: "OFFER",
    };
  }

  if (stage.includes("contacted") && daysSinceContact >= 3) {
    return {
      type: "FOLLOW_UP",
      label: "Zrób follow-up",
      rationale: `Brak odpowiedzi od ${Math.floor(daysSinceContact)} dni. Delikatne przypomnienie zwiększa szansę na odpowiedź.`,
      urgency: daysSinceContact >= 7 ? "high" : "medium",
      draftKind: "FOLLOW_UP",
    };
  }

  if (stage.includes("new") || daysSinceContact < 3) {
    return {
      type: "QUALIFY",
      label: "Zakwalifikuj leada",
      rationale: "Potwierdź dopasowanie, budżet i termin, zanim zainwestujesz więcej czasu.",
      urgency: "medium",
      draftKind: "DM",
    };
  }

  if (daysSinceContact >= 14) {
    return {
      type: "RE_ENGAGE",
      label: "Odnów kontakt",
      rationale: `Cisza od ${Math.floor(daysSinceContact)} dni — ożyw relację, dając świeżą wartość.`,
      urgency: "medium",
      draftKind: "FOLLOW_UP",
    };
  }

  return {
    type: "NURTURE",
    label: "Podtrzymuj relację",
    rationale: "Wszystko idzie zgodnie z planem — pozostań w pamięci dzięki trafnym kontaktom.",
    urgency: "low",
    draftKind: "FOLLOW_UP",
  };
}
