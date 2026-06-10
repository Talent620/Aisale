import type { ContentKind } from "@prisma/client";
import type { CompanyContext, LeadContext, OfferContext } from "./prompts";

const firstName = (name?: string | null) => (name ? name.split(" ")[0] : "");

export interface MockGenArgs {
  kind: ContentKind;
  company: CompanyContext;
  lead?: LeadContext;
  offer?: OfferContext;
  tone?: string;
  userPrompt?: string;
}

/**
 * Deterministic, presentable Polish copy used when no live model is
 * configured. It references the real lead/offer/company so the product demos
 * convincingly out of the box — and is clearly labelled as a draft in the UI.
 */
export function mockGenerateContent(a: MockGenArgs): string {
  const fn = firstName(a.lead?.name);
  const hi = fn ? `Dzień dobry, Panie/Pani ${fn}` : "Dzień dobry";
  const co = a.company.name;
  const leadCo = a.lead?.companyName ?? "Państwa firma";
  const offer = a.offer?.name ?? "to, co robimy";
  const hook =
    a.userPrompt?.trim() ||
    `pomagamy firmom z branży ${a.lead?.industry ?? "takich jak " + leadCo} szybciej zdobywać klientów`;

  switch (a.kind) {
    case "EMAIL":
      return `Temat: Szybki pomysł dla ${leadCo}

${hi},

trafiłem na ${leadCo} i zwróciłem uwagę, że ${hook}. W ${co} pomagamy podobnym firmom uciąć żmudną pracę i działać szybciej — to sedno usługi ${offer}.

Czy znajdzie się 15 minut w przyszłym tygodniu na krótką rozmowę? Niezależnie od decyzji chętnie podzielę się jednym konkretnym pomysłem.

Pozdrawiam,
${co}`;
    case "DM":
      return `${hi} — widziałem, co robi ${leadCo}, robi wrażenie. Pracujemy z firmami nad tym: ${hook}. Ma Pan/Pani chwilę na krótką wymianę spostrzeżeń?`;
    case "FOLLOW_UP":
      return `${hi},

wracam do mojej poprzedniej wiadomości. Od tego czasu przygotowałem krótki materiał konkretnie pod ${leadCo} — w temacie: ${hook}.

Bez nacisku — wysłać go, czy to nie jest dobry moment?

${co}`;
    case "AD":
      return `A) „${leadCo} zostawia pieniądze na stole.”
${offer} zamienia żmudną część pozyskiwania klientów w jeden spokojny proces.
→ Zobacz, jak to działa

B) Przestań ręcznie gonić zimne leady.
Oceniaj, priorytetyzuj i docieraj najpierw do właściwych osób — automatycznie.
→ Zacznij za darmo

C) Dla małych zespołów, które grają powyżej swojej wagi.
${offer}: mniej narzędzi, więcej umówionych rozmów.
→ Umów prezentację`;
    case "POST":
      return `Większość małych firm nie ma problemu z leadami. Ma problem z follow-upem.

„Stracone” transakcje zwykle nie były stracone — zostały zapomniane czwartego dnia.

Co to u nas zmieniło: ${hook}, plus system, który sam podpowiada następny ruch.

A Wy jak pilnujecie, żeby follow-upy nie uciekały?`;
    case "OFFER":
      return `${offer} — oferta w pigułce

Problem
${leadCo} spędza godziny na ręcznym docieraniu do klientów i follow-upach, których nikt nie mierzy.

Co dostajecie
${(a.offer?.deliverables?.length
        ? a.offer.deliverables
        : ["Konfiguracja zbierania i scoringu leadów", "Automatyzacja lejka i follow-upów", "Szablony wiadomości i reklam", "Cotygodniowy raport wyników"]
      )
        .map((d) => `• ${d}`)
        .join("\n")}

Efekt
Przewidywalny, mierzalny system pozyskiwania klientów, który realnie da się prowadzić.

Termin: 2–3 tygodnie do startu.
${a.offer?.priceFrom ? `Inwestycja: od ${a.offer.priceFrom} ${a.company.currency ?? "PLN"}.` : "Inwestycja: wyceniana pod potrzeby."}`;
    case "SUBJECT_LINE":
      return `1. Szybki pomysł dla ${leadCo}
2. ${fn || "Dzień dobry"}, warte 15 minut?
3. Luka w follow-upie (i jak ją zamknąć)
4. Jeden konkret dla ${leadCo}
5. Wysłać to Panu/Pani?
6. ${a.lead?.industry ?? "Państwa firma"} → mniej narzędzi, więcej telefonów`;
    case "COLD_CALL_SCRIPT":
      return `Otwarcie: „${hi}, dzwonię trochę znienacka — dam radę w 20 sekund, a Pan/Pani zdecyduje, czy warto kontynuować?”

Powód: „Pomagamy firmom takim jak ${leadCo} w temacie: ${hook} — bez dokładania kolejnych narzędzi.”

Prośba: „Czy ma sens, żebyśmy złapali się na 15 minut w tym tygodniu?”

Jeśli brak czasu: „Żaden problem — jak najlepiej wysłać jedno-zdaniowe podsumowanie?”`;
    default:
      return `Szkic dla ${leadCo}: ${hook}.`;
  }
}

export interface MockCopilotSnapshot {
  totalLeads: number;
  hotLeads: number;
  openTasks: number;
  overdueTasks: number;
  pendingApprovals: number;
  wonValue: number;
  pipelineValue: number;
  replyRate: number;
  currency: string;
}

export function mockCopilot(message: string, s: MockCopilotSnapshot): string {
  const m = message.toLowerCase();
  const money = (n: number) =>
    new Intl.NumberFormat("pl-PL", { style: "currency", currency: s.currency, maximumFractionDigits: 0 }).format(n);

  if (m.includes("today") || m.includes("dzi") || m.includes("next") || m.includes("focus") || m.includes("skup")) {
    return `Na czym skupiłbym się dzisiaj:

1. Gorące leady (scoring ≥ 75): ${s.hotLeads} — odezwij się, zanim ostygną.
2. Zaległe zadania: ${s.overdueTasks}${s.overdueTasks ? " — najpierw wyczyść te" : " — brawo, nic nie zalega"}.
3. Drafty AI czekające w Akceptacjach: ${s.pendingApprovals}.

Dlaczego: gorące leady i zaległe follow-upy to miejsca, gdzie transakcje wyciekają najszybciej. Mam przygotować pierwszą wiadomość?`;
  }
  if (m.includes("summary") || m.includes("how are we") || m.includes("podsum") || m.includes("status")) {
    return `Szybki obraz biznesu:

• Lejek: ${money(s.pipelineValue)} w ${s.totalLeads} leadach (gorących: ${s.hotLeads}).
• Wygrane do tej pory: ${money(s.wonValue)}.
• Wskaźnik odpowiedzi: ${s.replyRate}%.
• Otwarte zadania: ${s.openTasks} (zaległych: ${s.overdueTasks}).

${s.replyRate < 15 ? "Wskaźnik odpowiedzi jest niski — dźwignią jest treść wiadomości albo targetowanie." : "Wskaźnik odpowiedzi zdrowy — skup się na wolumenie do najlepszych segmentów."}`;
  }
  if (m.includes("improve") || m.includes("funnel") || m.includes("popraw") || m.includes("lejek")) {
    return `Sugestie dla lejka na bazie obecnych liczb:

• ${s.replyRate < 15 ? "Wąskim gardłem jest wskaźnik odpowiedzi. Zaostrz pierwsze zdanie i personalizuj hak pod segment." : "Góra lejka konwertuje — dołóż wolumen do najlepszego źródła."}
• ${s.overdueTasks > 0 ? `Masz ${s.overdueTasks} zaległych follow-upów; konsekwencja tutaj zwykle podnosi konwersję bardziej niż nowe leady.` : "Follow-upy idą na czas — tak trzymaj."}
• Szybciej przeprowadzaj zakwalifikowane leady do konkretnej oferty — tempo wysłania oferty koreluje z domykaniem.

Mogę przygotować wiadomości pod każdy z tych punktów.`;
  }
  return `Pomogę Ci zdecydować, co robić dalej, napisać wiadomości, przeczytać lejek albo podsumować biznes.

Teraz: ${s.totalLeads} leadów, gorących ${s.hotLeads}, otwartych zadań ${s.openTasks}, akceptacji w kolejce ${s.pendingApprovals}, lejek ${money(s.pipelineValue)}.

Spróbuj: „na czym mam się dziś skupić?”, „podsumuj biznes” albo „jak poprawić lejek?”.

(Uwaga: działa wbudowany tryb demo — dodaj klucz AI w .env, aby dostawać żywe, dopasowane odpowiedzi.)`;
}
