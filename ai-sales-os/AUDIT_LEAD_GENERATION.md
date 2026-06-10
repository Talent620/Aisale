# Audyt funkcjonalności — narzędzie do pozyskiwania leadów

Data audytu: 2026-06-10 · Zakres: cały kod źródłowy (`src/`), schemat bazy (`prisma/`), API, frontend, integracje, konfiguracja i dokumentacja.

Legenda: ✅ w pełni zaimplementowane · ⚠️ częściowo · ❌ brak (stan PRZED implementacją z tego audytu; kolumna „Po audycie" pokazuje stan po wdrożeniu)

## 1. Pozyskiwanie danych

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Formularze kontaktowe | ✅ | ✅ | Publiczny endpoint `POST /api/public/leads` z tokenem, honeypotem i rate-limitem |
| Landing page'e | ❌ | ✅ | **DODANO:** publiczny landing `/l/[slug]` z formularzem i zgodą marketingową |
| Integracje z social media | ✅ | ✅ | Social Studio (publikacja FB/IG/GBP) + webhook Meta Lead Ads |
| Import leadów z CSV | ❌ | ✅ | **DODANO:** `POST /api/leads/import` + dialog importu na liście leadów (mapowanie nagłówków, dedup, zgody) |
| Facebook Lead Ads | ✅ | ✅ | Webhook `POST /api/webhooks/meta` z normalizacją pól |
| Google Ads | ⚠️ | ⚠️ | Webhook Google Lead Forms działa; zarządzanie kampaniami przez Google Ads API wymaga płatnego konta i zgody (developer token) — patrz TODO |
| LinkedIn | ⚠️ | ⚠️ | Kanał LinkedIn w sekwencjach/kampaniach (drafty DM, eksport copy); oficjalne API LinkedIn jest zamknięte dla automatyzacji outreach — celowo copy-paste |

## 2. Kwalifikacja leadów

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Lead scoring | ✅ | ✅ | Deterministyczny silnik 0–100 z wyjaśnialnym podziałem (`src/lib/scoring.ts`), historia w `LeadScore` |
| Pola niestandardowe | ❌ | ✅ | **DODANO:** `Lead.customFields` (JSON) + edytor klucz-wartość na karcie leada |
| Segmentacja leadów | ⚠️ | ⚠️→✅(API) | Model `Segment` istniał bez API/UI; **DODANO** API `GET/POST /api/segments` + przypisywanie leadów; pełne UI w TODO |
| Automatyczne oznaczanie źródła | ✅ | ✅ | `source` + `sourceDetail` ustawiane we wszystkich ścieżkach (formularz, webhooki, discovery, Lead Finder, CSV, landing) |

## 3. Automatyzacja

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Automatyczne e-maile | ✅ | ✅ | Wysyłka przy akceptacji + tryb pełnej automatyzacji z dziennym limitem (Resend/Mailgun, symulacja bez kluczy) |
| Sekwencje follow-up | ✅ | ✅ | Silnik kadencji (4-touch domyślny), auto-enroll, personalizacja faktami z audytu strony |
| Powiadomienia dla handlowców | ✅ | ✅ | Model `Notification` + dzwonek w topbarze (hot lead, autopilot, publikacje) |
| Automatyczne przypisywanie leadów | ⚠️ | ✅ | Było: zawsze pierwszy użytkownik. **DODANO:** round-robin — lead trafia do członka zespołu z najmniejszą liczbą otwartych leadów |

## 4. Zarządzanie kontaktami

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Historia interakcji | ✅ | ✅ | `LeadActivity` (timeline na karcie leada) + `CallLog` |
| Notatki | ✅ | ✅ | Model `Note` z pinowaniem + notatki przy rozmowach |
| Zadania | ✅ | ✅ | Pełny moduł `/tasks` + auto-zadania (callback, akceptacje) |
| Statusy leadów | ✅ | ✅ | Lejek (`FunnelStage`), `outcome`, `callStatus` (8 statusów telefonicznych) |
| Wyszukiwanie i filtrowanie | ✅ | ✅ | Filtry listy (fraza, etap, źródło) + globalna wyszukiwarka Ctrl+K |

## 5. Raportowanie

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Liczba leadów | ✅ | ✅ | Dashboard + Analytics (trendy `MetricSnapshot`) |
| Koszt pozyskania leada (CPL) | ❌ | ✅ | **DODANO:** model `ChannelCost` (koszt/kanał/miesiąc), API `/api/costs`, sekcja „Channel performance" w Analytics z CPL i kosztem na wygraną |
| Współczynnik konwersji | ⚠️ | ✅ | Win-rate był w snapshot; **DODANO** konwersję per kanał w nowej sekcji |
| Analiza skuteczności kanałów | ⚠️ | ✅ | Był tylko rozkład źródeł; **DODANO** tabelę: leady / wygrane / konwersja / koszt / CPL per źródło |

## 6. Integracje

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| CRM | ✅ | ✅ | Aplikacja sama jest CRM-em; sync z zewnętrznym CRM przez publiczne API/webhooki |
| E-mail marketing | ✅ | ✅ | Resend / Mailgun + szablony + kampanie |
| Kalendarze | ⚠️ | ✅ | Był webhook Calendly; **DODANO:** feed iCalendar `GET /api/calendar/ics?token=…` (zadania + zaplanowane telefony) — subskrypcja w Google Calendar/Outlook/Apple |
| Telefonia | ⚠️ | ⚠️ | Linki `tel:` + pełny rejestr rozmów; integracja VoIP (Twilio) wymaga płatnego konta — patrz TODO |
| Publiczne API | ⚠️ | ✅ | Był tylko endpoint formularza; **DODANO:** klucze API (`ApiKey`, SHA-256) + REST `GET/POST /api/v1/leads` z Bearer auth |

## 7. Zgodność (RODO/GDPR)

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Obsługa zgód marketingowych | ❌ | ✅ | **DODANO:** `marketingConsent` na leadzie, checkbox na landingu, flaga przy imporcie CSV i w publicznym API |
| RODO/GDPR | ⚠️ | ✅ | Był soft-delete + nota informacyjna; **DODANO:** eksport pełnych danych leada `GET /api/leads/[id]/export` (JSON, prawo do przenoszenia danych) |
| Rejestrowanie źródła i czasu zgody | ❌ | ✅ | **DODANO:** `consentAt` + `consentSource` zapisywane automatycznie przy każdej ścieżce zgody |

## 8. Funkcje AI

| Funkcja | Stan | Po audycie | Szczegóły |
|---|---|---|---|
| Wyszukiwanie firm | ✅ | ✅ | Lead Finder: Google Places (New) + CEIDG + mock |
| Wyszukiwanie kontaktów | ✅ | ✅ | Apollo.io / Hunter.io + mock |
| Data enrichment | ✅ | ✅ | Domena z e-maila, szacowana wartość, priorytet, rescoring (`src/lib/acquisition/enrich.ts`) |
| Generowanie spersonalizowanych wiadomości | ✅ | ✅ | OpenAI/Anthropic/mock; personalizacja faktami z audytu („strona ładuje się 8,4 s") |
| Wykrywanie decydentów | ⚠️ | ✅ | Seniority podbijało priorytet; **DODANO:** jawny tag `decision-maker` na leadzie |
| Buyer intent / analiza intencji | ⚠️ | ⚠️ | `intentScore` + sygnały od providerów wpływają na ranking i prompt; brak dedykowanego dashboardu intencji — patrz TODO |

## Podsumowanie braków (przed implementacją) — priorytety

| Brak | Priorytet | Wpływ biznesowy | Trudność |
|---|---|---|---|
| Zgody marketingowe + rejestr zgód | **Krytyczny** | Legalność cold outreach w PL/UE (UŚUDE/Prawo telekom.); bez tego ryzyko prawne | Niska |
| Import CSV | Wysoki | Najszybsza droga zasilenia bazy z dowolnego źródła | Niska |
| CPL + skuteczność kanałów | Wysoki | Bez kosztów nie wiadomo, który kanał zarabia | Średnia |
| Landing page | Wysoki | Domyka pętlę: reklama z Social Studio → landing → lead w CRM | Średnia |
| Publiczne API (klucze) | Średni | Integracje zewnętrzne (Zapier/Make już przez webhook; API daje odczyt) | Średnia |
| Feed kalendarza (ICS) | Średni | Callbacki i zadania w telefonie/Outlooku bez przepisywania | Niska |
| Pola niestandardowe | Średni | Dopasowanie CRM do własnego procesu | Niska |
| Round-robin | Niski | Sprawiedliwy rozdział przy >1 handlowcu | Bardzo niska |
| Segmenty (API) | Niski | Fundament pod kampanie celowane | Niska |
| Google Ads API, Twilio, intent dashboard | — | Wymagają płatnych kont / decyzji — patrz `TODO_MANUAL_ACTIONS.md` | Wysoka |

Wszystkie pozycje z kolumną „**DODANO**" zostały zaimplementowane w ramach tego audytu — szczegóły w `IMPLEMENTATION_SUMMARY.md`, działania wymagające Twojej decyzji w `TODO_MANUAL_ACTIONS.md`.
