import type { CallStatus, Lead, WebsiteAudit } from "@prisma/client";

/**
 * Deterministic sales playbook ("battle card") for a lead — Polish UI copy.
 * Grounded in cold-outreach research: 93% of converted leads need 6+ touches,
 * multi-channel lifts replies ~37%, best call windows for owners are Tue–Thu
 * 9–11 and 15–17, and a free mini-audit is the classic foot-in-the-door.
 */

export interface PlaybookAngle {
  title: string;
  detail: string;
  power: "high" | "medium";
}

export interface PlaybookStatusItem {
  label: string;
  detail: string | null;
  done: boolean;
}

export interface PlaybookMove {
  title: string;
  detail: string;
}

export interface PlaybookObjection {
  objection: string;
  answer: string;
}

export interface Playbook {
  summary: string;
  angles: PlaybookAngle[];
  opener: string;
  status: PlaybookStatusItem[];
  moves: PlaybookMove[];
  objections: PlaybookObjection[];
  callWindow: string;
}

export interface PlaybookInput {
  lead: Pick<
    Lead,
    | "name"
    | "companyName"
    | "industry"
    | "region"
    | "source"
    | "tags"
    | "hasWebsite"
    | "auditScore"
    | "callStatus"
    | "callAttempts"
    | "lastCallAt"
    | "score"
    | "createdAt"
  >;
  stageName?: string | null;
  audit?: Pick<
    WebsiteAudit,
    "overall" | "loadTimeMs" | "https" | "mobileFriendly" | "issues"
  > | null;
  emailsSent: number;
  lastEmailAt?: Date | null;
  lastCallNote?: string | null;
}

const CALL_STATUS_PL: Record<CallStatus, string> = {
  NOT_CALLED: "nie dzwoniono",
  NO_ANSWER: "nie odebrał",
  VOICEMAIL: "poczta głosowa",
  WRONG_NUMBER: "zły numer",
  CALLBACK: "umówione oddzwonienie",
  INTERESTED: "zainteresowany",
  NOT_INTERESTED: "niezainteresowany",
  MEETING_BOOKED: "spotkanie umówione",
};

function buildAngles(input: PlaybookInput): PlaybookAngle[] {
  const { lead, audit } = input;
  const angles: PlaybookAngle[] = [];

  if (lead.hasWebsite === false || lead.tags.includes("no-website")) {
    angles.push({
      title: "Brak strony WWW — niewidoczni w Google",
      power: "high",
      detail:
        "Klienci, którzy właśnie ich szukają, trafiają do konkurencji. Najłatwiejsza sprzedaż: nie sprzedawaj „strony”, sprzedawaj klientów, których tracą co tydzień.",
    });
  }
  if (audit) {
    if (audit.loadTimeMs != null && audit.loadTimeMs > 3000) {
      angles.push({
        title: `Strona ładuje się ${(audit.loadTimeMs / 1000).toFixed(1)} s`,
        power: "high",
        detail:
          "Ludzie odpadają po ~3 sekundach — każda kolejna to utracone telefony. Zacytuj im ich własny wynik; konkret bije każdą gadkę sprzedażową.",
      });
    }
    if (!audit.https) {
      angles.push({
        title: "Przeglądarka pokazuje „Niezabezpieczona”",
        power: "high",
        detail:
          "Chrome dosłownie odstrasza ich klientów. Pokaż zrzut ekranu ostrzeżenia na ICH stronie — sprzedaje się samo.",
      });
    }
    if (audit.mobileFriendly === false) {
      angles.push({
        title: "Strona nie działa na telefonach",
        power: "high",
        detail:
          "Większość lokalnych wyszukiwań to telefon. Otwórz ich stronę na swoim telefonie w trakcie rozmowy i daj im to zobaczyć.",
      });
    }
    if (audit.overall < 50 && angles.length === 0) {
      angles.push({
        title: `Zdrowie strony tylko ${audit.overall}/100`,
        power: "medium",
        detail: "Sprzedawaj przebudowę jako odzyskanie traconych klientów, nie jako koszt.",
      });
    }
  }
  if (lead.tags.includes("new-company")) {
    angles.push({
      title: "Świeżo zarejestrowana firma",
      power: "medium",
      detail:
        "Właśnie wszystko organizują — strona, wizytówka Google, logo. Bądź pierwszy z pakietem startowym, zanim dotrze do nich agencja z billboardów.",
    });
  }
  if (angles.length === 0) {
    angles.push({
      title: "Więcej klientów z Google",
      power: "medium",
      detail:
        "Brak oczywistej słabości w danych — najpierw odpal audyt strony, potem uderzaj w to, co znajdzie (szybkość, opinie, widoczność).",
    });
  }
  return angles.slice(0, 3);
}

function buildOpener(input: PlaybookInput, angles: PlaybookAngle[]): string {
  const company = input.lead.companyName ?? input.lead.name;
  const top = angles[0];
  const fact = top.title.startsWith("Brak strony")
    ? `zanim zadzwoniłem, szukałem Państwa strony i nie mogłem jej znaleźć — gdy ktoś wpisuje w Google „${input.lead.industry ?? "Państwa usługa"}${input.lead.region ? ` ${input.lead.region}` : ""}”, znajduje konkurencję`
    : input.audit?.loadTimeMs && input.audit.loadTimeMs > 3000
      ? `sprawdziłem przed telefonem Państwa stronę — na telefonie otwiera się ${(input.audit.loadTimeMs / 1000).toFixed(1)} sekundy, a większość ludzi rezygnuje po trzech`
      : input.audit && !input.audit.https
        ? `sprawdziłem przed telefonem Państwa stronę — przeglądarki oznaczają ją jako „Niezabezpieczona”, co odstrasza klientów`
        : `sprawdziłem przed telefonem, jak ${company} wygląda w Google`;
  return `„Dzień dobry, [Twoje imię] z [Twoja firma]. Będę się streszczać — ${fact}. Naprawiamy dokładnie to dla branży ${input.lead.industry ?? "lokalnych firm"}. Jeśli wyślę Państwu darmowy, jednostronicowy audyt — znajdzie się w tym tygodniu 10 minut na telefon o wnioskach?”`;
}

function buildStatus(input: PlaybookInput): PlaybookStatusItem[] {
  const { lead } = input;
  const called = lead.callAttempts > 0;
  const emailed = input.emailsSent > 0;
  const audited = lead.auditScore != null || lead.hasWebsite === false;
  const meeting = lead.callStatus === "MEETING_BOOKED";
  const stage = (input.stageName ?? "").toLowerCase();
  const proposal =
    stage.includes("proposal") || stage.includes("oferta") ||
    stage.includes("negotiation") || stage.includes("negocjacje");

  return [
    {
      label: "Telefon wykonany",
      done: called,
      detail: called
        ? `${lead.callAttempts}× · ostatni wynik: ${CALL_STATUS_PL[lead.callStatus]}`
        : "jeszcze nie dzwoniono",
    },
    {
      label: "E-mail wysłany",
      done: emailed,
      detail: emailed ? `wysłano ${input.emailsSent}×` : "nic nie wysłano",
    },
    {
      label: "Audyt strony",
      done: audited,
      detail:
        lead.hasWebsite === false
          ? "brak strony (to JEST argument sprzedażowy)"
          : lead.auditScore != null
            ? `zdrowie ${lead.auditScore}/100`
            : "odpal audyt — będziesz mieć konkrety do rozmowy",
    },
    { label: "Spotkanie umówione", done: meeting, detail: meeting ? null : "jeszcze nie" },
    {
      label: "Oferta wysłana",
      done: proposal,
      detail: input.stageName ? `etap: ${input.stageName}` : null,
    },
  ];
}

function buildMoves(input: PlaybookInput): PlaybookMove[] {
  const { lead } = input;
  const moves: PlaybookMove[] = [];
  const touches = lead.callAttempts + input.emailsSent;

  // Suggest the audit before fresh pitches — but not for retry states, where
  // the moves below already cover sending the audit between attempts.
  if (
    lead.auditScore == null &&
    lead.hasWebsite !== false &&
    lead.callStatus !== "NO_ANSWER" &&
    lead.callStatus !== "VOICEMAIL"
  ) {
    moves.push({
      title: "Najpierw odpal audyt strony",
      detail:
        "Dzwoń z ich prawdziwymi liczbami („strona ładuje się 8 s”) zamiast ogólnej gadki — konkrety podwajają zaangażowanie.",
    });
  }

  switch (lead.callStatus) {
    case "NOT_CALLED":
      moves.push(
        {
          title: "Pierwszy telefon — otwieraj darmowym mini-audytem",
          detail:
            "Nie sprzedawaj strony na pierwszym telefonie. Zaproponuj darmowy jednostronicowy audyt (albo darmowy projekt strony głównej) — małe „tak”, które kupuje spotkanie.",
        },
        {
          title: "Tego samego dnia: krótki e-mail",
          detail:
            "3 zdania + audyt w załączniku. Telefon + e-mail razem podnosi odpowiedzi o ~37% vs sam telefon.",
        },
      );
      break;
    case "NO_ANSWER":
    case "VOICEMAIL":
      moves.push(
        {
          title: "Zmień porę, nie tylko wybieraj ponownie",
          detail:
            "Spróbuj drugiego okna (rano ↔ późne popołudnie). Właściciele odbierają najlepiej wt–czw, 9–11 i 15–17 — i ok. 5 minut przed pełną godziną.",
        },
        {
          title: "Między próbami wyślij audyt e-mailem",
          detail:
            "„Próbowałem się dodzwonić — w załączniku 1-stronicowy audyt Państwa strony, warte 2 minuty.” Następny telefon nie będzie już zimny.",
        },
      );
      break;
    case "CALLBACK":
      moves.push(
        {
          title: "Przygotuj jedno before/after na oddzwonienie",
          detail:
            "Lokalny przykład z liczbami („przebudowaliśmy podobną stronę: PageSpeed 24→96, telefony +40%”). Jedna konkretna historia bije dziesięć funkcji.",
        },
        {
          title: "Zadzwoń dokładnie o umówionej porze",
          detail: "Punktualność to pierwszy dowód, że dowozisz na czas.",
        },
      );
      break;
    case "INTERESTED":
      moves.push(
        {
          title: "Oferta w 24 h — kuj żelazo póki gorące",
          detail:
            "Jedna strona, trzy warianty (dobry/lepszy/najlepszy — większość bierze środkowy), cena zakotwiczona o klientów, których tracą.",
        },
        {
          title: "Umów spotkanie, podając dwa konkretne terminy",
          detail:
            "„Wtorek 10:00 czy czwartek 15:30?” — wybór godziny jest łatwiejszy niż decyzja, czy w ogóle się spotkać.",
        },
      );
      break;
    case "MEETING_BOOKED":
      moves.push(
        {
          title: "Daj małą wygraną przed spotkaniem",
          detail:
            "Wyślij audyt + jedną darmową szybką poprawkę. Reguła wzajemności: kupujemy od tych, którzy już nam pomogli.",
        },
        {
          title: "Zamykaj konkretną datą startu",
          detail:
            "„Pierwszą wersję postawimy w 7 dni — startujemy w poniedziałek?” Termin zamienia „może” w decyzję.",
        },
      );
      break;
    case "NOT_INTERESTED":
      moves.push({
        title: "Odłóż, nie kasuj — wróć za 60–90 dni",
        detail:
          "„Nie teraz” zwykle znaczy „jeszcze nie”. Ustaw zadanie powrotu; okoliczności (i sezony) się zmieniają.",
      });
      break;
    default:
      break;
  }

  if (
    touches >= 3 &&
    touches < 6 &&
    (lead.callStatus === "NOT_CALLED" ||
      lead.callStatus === "NO_ANSWER" ||
      lead.callStatus === "VOICEMAIL")
  ) {
    moves.push({
      title: `Nie odpuszczaj po ${touches} kontaktach`,
      detail:
        "93% pozyskanych klientów wymaga 6+ punktów kontaktu, a 60% mówi „nie” cztery razy, zanim powie „tak”. Zmieniaj kanał: telefon → e-mail → telefon → SMS/LinkedIn.",
    });
  }

  return moves.slice(0, 3);
}

const OBJECTIONS: PlaybookObjection[] = [
  {
    objection: "„Mam klientów z polecenia.”",
    answer:
      "Świetnie — strona mnoży polecenia. Gdy ktoś Pana poleca, nowy klient najpierw sprawdza Pana w Google. Brak strony = polecenie, które umiera po drodze.",
  },
  {
    objection: "„Za drogo.”",
    answer:
      "Rozbijmy to: wychodzi ~X zł miesięcznie w skali roku. Ile jest wart jeden klient? Jeśli strona przyniesie dwóch w miesiącu, zwraca się wielokrotnie. Sprzedawaj zwrot, nie cenę.",
  },
  {
    objection: "„Bratanek / znajomy mi zrobi.”",
    answer:
      "Super, że ma Pan kogoś! Darmowy audyt i tak warto wziąć — jeśli zrobi bratanek, audyt powie mu dokładnie, co poprawić. (Numer zostaje u Pana; bratankowie rzadko dowożą.)",
  },
  {
    objection: "„Mam Facebooka, wystarczy.”",
    answer:
      "Facebook dociera do tych, którzy już Pana obserwują. Google łapie ludzi, którzy AKTYWNIE szukają z pieniędzmi w ręku — „hydraulik w pobliżu” nigdy nie trafi na fanpage. Potrzebne jest jedno i drugie.",
  },
  {
    objection: "„Nie mam na to czasu.”",
    answer:
      "Właśnie dlatego to działa — od Pana potrzebujemy łącznie 20 minut, resztę robimy my. Pierwsza wersja w 7 dni bez kiwnięcia palcem.",
  },
];

export function buildPlaybook(input: PlaybookInput): Playbook {
  const { lead } = input;
  const angles = buildAngles(input);

  const descriptors = [
    lead.industry,
    lead.region,
    lead.hasWebsite === false
      ? "brak strony WWW"
      : lead.auditScore != null
        ? `słaba strona (${lead.auditScore}/100)`
        : null,
    lead.tags.includes("new-company") ? "świeżo zarejestrowana" : null,
  ].filter(Boolean);

  return {
    summary: `${lead.companyName ?? lead.name}${descriptors.length ? ` — ${descriptors.join(" · ")}` : ""}. Scoring leada: ${lead.score}/100.`,
    angles,
    opener: buildOpener(input, angles),
    status: buildStatus(input),
    moves: buildMoves(input),
    objections: OBJECTIONS,
    callWindow:
      "Najlepsze okna: wt–czw · 9:00–11:00 lub 15:00–17:00 (wtedy właściciele odbierają najczęściej; omijaj porę lunchu). Bonus: dzwoń ~5 min przed pełną godziną.",
  };
}
