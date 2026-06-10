import {
  ApprovalStatus,
  CallStatus,
  ContentKind,
  LeadOutcome,
  LeadSource,
  Priority,
  ScoreGrade,
  SocialChannel,
  SocialPostStatus,
  TaskStatus,
} from "@prisma/client";

/** Default pipeline created for every new company. */
export const DEFAULT_FUNNEL_STAGES = [
  { name: "Nowy", order: 1, probability: 0.05, color: "#94a3b8" },
  { name: "Kontakt", order: 2, probability: 0.15, color: "#0ea5e9" },
  { name: "Kwalifikacja", order: 3, probability: 0.35, color: "#6366f1" },
  { name: "Oferta", order: 4, probability: 0.55, color: "#a855f7" },
  { name: "Negocjacje", order: 5, probability: 0.75, color: "#f59e0b" },
  { name: "Wygrany", order: 6, probability: 1, color: "#16a34a", isWon: true },
  { name: "Przegrany", order: 7, probability: 0, color: "#ef4444", isLost: true },
] as const;

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Strona WWW",
  INBOUND_FORM: "Formularz",
  REFERRAL: "Polecenie",
  LINKEDIN: "LinkedIn",
  FACEBOOK_GROUP: "Grupa Facebook",
  MARKETPLACE: "Marketplace",
  COLD_OUTREACH: "Zimny kontakt",
  EVENT: "Wydarzenie",
  ADS: "Reklamy",
  GOOGLE_MAPS: "Google Maps",
  BUSINESS_REGISTRY: "Rejestr firm (CEIDG)",
  OTHER: "Inne",
};

export const CALL_STATUS_META: Record<
  CallStatus,
  { label: string; className: string }
> = {
  NOT_CALLED: { label: "Nie dzwoniono", className: "bg-muted text-muted-foreground border-border" },
  NO_ANSWER: { label: "Nie odebrał", className: "bg-secondary text-secondary-foreground border-border" },
  VOICEMAIL: { label: "Poczta głosowa", className: "bg-secondary text-secondary-foreground border-border" },
  WRONG_NUMBER: { label: "Zły numer", className: "bg-muted text-muted-foreground border-border" },
  CALLBACK: { label: "Oddzwonić", className: "bg-warning/10 text-warning border-warning/20" },
  INTERESTED: { label: "Zainteresowany", className: "bg-success/10 text-success border-success/20" },
  NOT_INTERESTED: { label: "Niezainteresowany", className: "bg-destructive/10 text-destructive border-destructive/20" },
  MEETING_BOOKED: { label: "Spotkanie umówione", className: "bg-success/10 text-success border-success/20" },
};

export const SOCIAL_CHANNEL_LABELS: Record<SocialChannel, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE_BUSINESS: "Google Business",
  LINKEDIN: "LinkedIn",
};

export const SOCIAL_POST_STATUS_META: Record<
  SocialPostStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Szkic", className: "bg-muted text-muted-foreground border-border" },
  SCHEDULED: { label: "Zaplanowany", className: "bg-warning/10 text-warning border-warning/20" },
  PUBLISHED: { label: "Opublikowany", className: "bg-success/10 text-success border-success/20" },
  FAILED: { label: "Błąd", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

/** Audit overall-score below this ⇒ the site is a "modernization" lead. */
export const WEAK_WEBSITE_THRESHOLD = 50;

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Niski",
  MEDIUM: "Średni",
  HIGH: "Wysoki",
  URGENT: "Pilny",
};

export const OUTCOME_LABELS: Record<LeadOutcome, string> = {
  OPEN: "Otwarty",
  WON: "Wygrany",
  LOST: "Przegrany",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Do zrobienia",
  IN_PROGRESS: "W toku",
  DONE: "Zrobione",
  CANCELLED: "Anulowane",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Oczekuje",
  APPROVED: "Zaakceptowano",
  REJECTED: "Odrzucono",
  EXECUTED: "Wykonano",
};

export const CONTENT_KIND_LABELS: Record<ContentKind, string> = {
  EMAIL: "E-mail (zimny / outreach)",
  DM: "Wiadomość prywatna (DM)",
  AD: "Tekst reklamy",
  FOLLOW_UP: "Follow-up",
  POST: "Post social media",
  OFFER: "Oferta / propozycja",
  SUBJECT_LINE: "Tematy e-maila",
  COLD_CALL_SCRIPT: "Skrypt rozmowy",
};

export const SCORE_GRADE_META: Record<
  ScoreGrade,
  { label: string; className: string; min: number }
> = {
  A: { label: "A · Gorący", className: "bg-success/10 text-success border-success/20", min: 75 },
  B: { label: "B · Ciepły", className: "bg-warning/10 text-warning border-warning/20", min: 50 },
  C: { label: "C · Chłodny", className: "bg-secondary text-secondary-foreground border-border", min: 25 },
  D: { label: "D · Zimny", className: "bg-muted text-muted-foreground border-border", min: 0 },
};

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "Pilny", className: "bg-destructive/10 text-destructive border-destructive/20" },
  HIGH: { label: "Wysoki", className: "bg-warning/10 text-warning border-warning/20" },
  MEDIUM: { label: "Średni", className: "bg-secondary text-secondary-foreground border-border" },
  LOW: { label: "Niski", className: "bg-muted text-muted-foreground border-border" },
};

/** Threshold used by jobs + dashboard to flag a lead as "hot". */
export const HOT_LEAD_THRESHOLD = 75;
