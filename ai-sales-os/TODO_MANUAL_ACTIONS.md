# TODO — działania wymagające Twojej decyzji / kluczy / kont

Wszystko poniżej ma już w kodzie **kompletną implementację z fallbackiem** (mock/symulacja),
więc aplikacja działa bez tych kroków — one tylko przełączają funkcję na „naprawdę".

## 1. Klucze API (darmowe lub freemium) — wpisz w `.env`

| Funkcja | Zmienna | Skąd wziąć | Koszt |
|---|---|---|---|
| Lead Finder — prawdziwe firmy z Google Maps | `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → Places API (New) | $200/mies. kredytu za darmo |
| Nowo zarejestrowane firmy (CEIDG) | `CEIDG_API_TOKEN` | dane.biznes.gov.pl → rejestracja → token JWT | darmowe |
| Większy limit audytów PageSpeed | `PAGESPEED_API_KEY` | console.cloud.google.com → PageSpeed Insights API | darmowe |
| Prawdziwa wysyłka e-maili | `RESEND_API_KEY` + `EMAIL_FROM` | resend.com (3 000 maili/mies. za darmo) | darmowe na start |
| Alternatywnie e-mail | `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` | mailgun.com | trial |
| Prawdziwe AI (zamiast mocka) | `AI_PROVIDER=anthropic` + `AI_API_KEY` + `AI_MODEL` | console.anthropic.com | płatne za użycie |
| Prospekty B2B (osoby) | `APOLLO_API_KEY` lub `HUNTER_API_KEY` | apollo.io / hunter.io | freemium |

## 2. Publikacja social — wymaga Twoich kont firmowych

| Kanał | Zmienne | Kroki |
|---|---|---|
| Facebook | `META_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` | developers.facebook.com → aplikacja → uprawnienie `pages_manage_posts` → token strony (long-lived) |
| Instagram | + `INSTAGRAM_BUSINESS_ID` | konto IG Business połączone ze stroną FB; posty wymagają `imageUrl` |
| Google Business Profile | `GBP_ACCESS_TOKEN`, `GBP_LOCATION_ID` | OAuth do Business Profile API (wymaga weryfikacji wizytówki) |

Bez tokenów publikacja jest symulowana (oznaczona „simulated") — flow testowalny od razu.

## 3. Wysyłka e-maili — zanim włączysz „naprawdę"
- Skonfiguruj **SPF + DKIM** dla swojej domeny u dostawcy (Resend/Mailgun pokazują rekordy DNS do wklejenia) — bez tego maile lądują w spamie.
- **Prawo (PL/UE):** cold e-mail do firm bez zgody narusza UŚUDE/Prawo telekomunikacyjne. Bezpieczny model: **najpierw telefon** (B2B dozwolony z rozwagą), w rozmowie pytasz o zgodę na wysłanie oferty/audytu → zaznaczasz zgodę w CRM → dopiero wtedy e-mail. Tryb auto-send włączaj świadomie.
- `dailyEmailCap` trzymaj nisko (20–50/dzień) — chroni reputację domeny.

## 4. Wdrożenie produkcyjne (żeby działało 24/7 + PWA z telefonu)
1. Konto na **vercel.com** → Import repo → katalog `ai-sales-os`.
2. Baza: **neon.tech** (darmowy Postgres) → skopiuj `DATABASE_URL`.
3. Env w Vercel: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://twojadomena.vercel.app`, `CRON_SECRET`, `ACQUISITION_AUTOPILOT_INPROCESS=0` + klucze z pkt 1.
4. Po deployu: `npx prisma db push` + seed (lokalnie z DATABASE_URL Neona) — albo zarejestruj firmę w aplikacji.
5. Cron co 15 min jest już w `vercel.json`.

## 5. Świadomie pominięte (wymagają płatnych kont / zgód platform)
- **Google Ads API** (zarządzanie kampaniami) — wymaga developer tokena i zatwierdzenia przez Google; obecnie: copy reklam z Social Studio wklejasz w Google Ads.
- **Telefonia VoIP (Twilio)** — płatne; obecnie: `tel:` + pełny rejestr rozmów. Po decyzji łatwo dodać click-to-call.
- **LinkedIn API** — zamknięte dla automatyzacji outreach (ban risk); obecnie: drafty DM do ręcznego wysłania.
- **Dashboard buyer-intent** — sygnały i `intentScore` już wpływają na ranking i prompty; osobny widok ma sens po podpięciu prawdziwych źródeł intencji.
- **UI segmentów** — API gotowe (`/api/segments`); widok listowy do dorobienia.

## 6. Pierwsze kroki po uruchomieniu (checklista dnia 1)
1. Uruchom `start.bat` → zaloguj się → **Settings**: zmień nazwę firmy, branżę i `aiContext` na swoje.
2. Załóż własne konto w **/register** (oddzielny workspace) albo zmień hasło demo.
3. **Lead Finder**: wpisz swoją kategorię @ miasto → importuj firmy bez stron.
4. **Calls**: dzwoń z górnej części kolejki, loguj wyniki jednym kliknięciem.
5. **Analytics**: wpisz miesięczne wydatki na kanały → patrz na CPL.
6. Po podpięciu domeny/wdrożeniu: udostępnij landing `/l/<twoj-slug>` w reklamach.
