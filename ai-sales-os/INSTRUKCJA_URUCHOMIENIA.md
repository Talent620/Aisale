# 🚀 AI Sales OS — instrukcja uruchomienia krok po kroku

Ten plik przeprowadzi Cię od zera do działającego programu w ~10 minut.

## Krok 1 — Zainstaluj dwa darmowe programy (jednorazowo)

1. **Node.js 20** → https://nodejs.org → przycisk „LTS" → zainstaluj (dalej, dalej, dalej).
2. **Docker Desktop** → https://docker.com → „Download" → zainstaluj → **uruchom go** (ikona wieloryba musi działać w zasobniku).

## Krok 2 — Rozpakuj program

Rozpakuj pobrany ZIP w dowolne miejsce, np. `C:\AI-Sales-OS\`.

## Krok 3 — Uruchom JEDNYM kliknięciem

Wejdź do folderu **`ai-sales-os`** i kliknij dwa razy:

- **Windows:** `start.bat`
- **macOS / Linux:** `start.sh`

Skrypt zrobi wszystko sam (pierwszy raz ~3–5 minut):
zainstaluje zależności → uruchomi bazę danych → wygeneruje konfigurację →
wgra dane demo → zbuduje aplikację → **otworzy przeglądarkę** → autopilot
pozyskiwania zacznie tykać w tle.

> Jeśli Windows pokaże „chroniono ten komputer" — kliknij „Więcej informacji" → „Uruchom mimo to".
> Kolejne uruchomienia trwają kilka sekund. Zamknięcie czarnego okna = zatrzymanie programu.

## Krok 4 — Zaloguj się

```
http://localhost:3000
login:  owner@northstar.studio
hasło:  demo1234
```

Potem w **Settings** zmień nazwę firmy i opis (aiContext) na swoje, albo załóż
własne konto przez `/register` (czysty, oddzielny workspace).

## Krok 5 — Zainstaluj jako aplikację (Windows + telefon)

- **Windows:** w Edge/Chrome kliknij ikonę **„Zainstaluj aplikację"** w pasku adresu —
  dostaniesz osobne okno i ikonę w Menu Start.
- **Telefon (ta sama sieć Wi-Fi):** wejdź na `http://IP-KOMPUTERA:3000`
  (IP sprawdzisz: `ipconfig` → IPv4). Pełna instalacja PWA wymaga HTTPS —
  najprościej przez darmowy tunel: `npx cloudflared tunnel --url http://localhost:3000`
  i otwórz otrzymany adres `https://…trycloudflare.com` na telefonie →
  „Dodaj do ekranu głównego".

## Krok 6 — Pierwszy dzień pracy (co klikać)

1. **Lead Finder** (`/prospecting`) → wpisz np. „fryzjer @ Warszawa" → Szukaj →
   zaznacz firmy **bez strony WWW** → „Import selected".
2. **Calls** (`/calls`) → dzwoń od góry kolejki (przycisk z numerem) → po rozmowie
   jeden klik: status + notatka.
3. **Karta leada** → „Battle card" mówi Ci, w co uderzyć i co robić dalej.
4. **Approvals** → akceptujesz maile napisane przez AI (akceptacja = wysyłka).
5. **Social Studio** (`/social`) → AI pisze reklamę → publikujesz / planujesz.
6. **Analytics** → wpisz wydatki na kanały → widzisz CPL i co się opłaca.

## Działa od razu BEZ żadnych kluczy

Bez konfiguracji program używa danych przykładowych i symulowanych wysyłek
(wszystko wyraźnie oznaczone) — możesz przeklikać całość. Żeby przejść „na ostro",
otwórz plik **`TODO_MANUAL_ACTIONS.md`** — tabela mówi dokładnie skąd wziąć każdy
darmowy klucz (Google Maps, CEIDG, Resend…) i gdzie go wkleić (plik `.env`).

## Najczęstsze problemy

| Problem | Rozwiązanie |
|---|---|
| „Node.js not found" | Zainstaluj Node z https://nodejs.org i uruchom `start.bat` ponownie |
| „Docker is missing / database did not start" | Uruchom Docker Desktop (wieloryb w zasobniku) i spróbuj znowu |
| Strona nie otwiera się | Poczekaj ~30 s przy pierwszym starcie; sprawdź czarne okno — tam widać postęp |
| Port 3000 zajęty | Zamknij inne aplikacje deweloperskie albo zrestartuj komputer |

## Co dalej (żeby działało 24/7 i z telefonu wszędzie)

Wdrożenie na darmowy hosting **Vercel + Neon** — dokładna checklista w
`TODO_MANUAL_ACTIONS.md`, sekcja 4. Dostaniesz stały adres `https://…vercel.app`,
który otwierasz i instalujesz na każdym urządzeniu.

Powodzenia! 🎯
