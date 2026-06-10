/**
 * Tiny dependency-free CSV parser + lead-column mapper for the CSV import.
 * Handles quoted fields, escaped quotes, CRLF and semicolon-delimited files
 * (common for Polish Excel exports). Pure functions — unit-tested.
 */

export function detectDelimiter(headerLine: string): string {
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [
    d,
    headerLine.split(d).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** Parse CSV text into rows of string cells. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const clean = text.replace(/^﻿/, ""); // strip BOM
  const firstLine = clean.slice(0, clean.indexOf("\n") === -1 ? undefined : clean.indexOf("\n"));
  const delim = delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Recognised lead columns → header aliases (EN + PL). */
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "imię i nazwisko", "imie i nazwisko", "osoba", "kontakt", "full name", "contact"],
  email: ["email", "e-mail", "mail", "adres email", "adres e-mail"],
  phone: ["phone", "telefon", "tel", "numer telefonu", "phone number", "mobile", "komórka", "komorka"],
  companyName: ["company", "companyname", "firma", "nazwa firmy", "company name", "organizacja"],
  website: ["website", "www", "strona", "strona www", "url", "site"],
  industry: ["industry", "branża", "branza", "kategoria"],
  region: ["region", "city", "miasto", "miejscowość", "miejscowosc", "lokalizacja", "województwo", "wojewodztwo"],
  position: ["position", "stanowisko", "title", "rola"],
  message: ["message", "notes", "notatka", "uwagi", "note", "komentarz"],
};

export type LeadColumn = keyof typeof COLUMN_ALIASES & string;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map header cells to known lead columns (null for unrecognised columns). */
export function mapHeaders(headers: string[]): (LeadColumn | null)[] {
  return headers.map((h) => {
    const n = normalizeHeader(h);
    for (const [col, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(n)) return col as LeadColumn;
    }
    return null;
  });
}

export interface CsvLeadRow {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  region?: string;
  position?: string;
  message?: string;
}

/** Parse CSV text into normalized lead rows (header row required). */
export function csvToLeadRows(text: string): { rows: CsvLeadRow[]; recognised: string[]; skipped: number } {
  const all = parseCsv(text);
  if (all.length < 2) return { rows: [], recognised: [], skipped: 0 };

  const mapping = mapHeaders(all[0]);
  const recognised = mapping.filter((m): m is LeadColumn => m !== null);
  let skipped = 0;

  const rows: CsvLeadRow[] = [];
  for (const cells of all.slice(1)) {
    const row: CsvLeadRow = {};
    mapping.forEach((col, i) => {
      const v = cells[i]?.trim();
      if (col && v) row[col as keyof CsvLeadRow] = v;
    });
    if (row.name || row.email || row.phone || row.companyName) rows.push(row);
    else skipped++;
  }
  return { rows, recognised: Array.from(new Set(recognised)), skipped };
}
