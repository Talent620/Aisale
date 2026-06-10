import { describe, expect, it } from "vitest";
import { csvToLeadRows, detectDelimiter, mapHeaders, parseCsv } from "@/lib/csv";

describe("detectDelimiter", () => {
  it("detects commas, semicolons and tabs", () => {
    expect(detectDelimiter("a,b,c")).toBe(",");
    expect(detectDelimiter("a;b;c")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });
});

describe("parseCsv", () => {
  it("parses quoted fields with embedded delimiters and quotes", () => {
    const rows = parseCsv('name,note\n"Kowalski, Jan","said ""hi"""\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Kowalski, Jan", 'said "hi"'],
    ]);
  });

  it("handles CRLF and skips blank lines", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n\r\n3,4\r\n");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual(["3", "4"]);
  });

  it("supports semicolon-delimited (Polish Excel) files", () => {
    const rows = parseCsv("imię i nazwisko;telefon\nJan;+48 600 100 200\n");
    expect(rows[1]).toEqual(["Jan", "+48 600 100 200"]);
  });
});

describe("mapHeaders", () => {
  it("maps Polish and English aliases", () => {
    expect(mapHeaders(["Imię i nazwisko", "TELEFON", "Firma", "unknown"])).toEqual([
      "name",
      "phone",
      "companyName",
      null,
    ]);
  });
});

describe("csvToLeadRows", () => {
  it("builds lead rows and skips rows without any contact data", () => {
    const { rows, recognised, skipped } = csvToLeadRows(
      "name,email,notatka\nAnna,anna@firma.pl,VIP\n,,note without contact\nBartek,,call later\n",
    );
    expect(rows).toEqual([
      { name: "Anna", email: "anna@firma.pl", message: "VIP" },
      { name: "Bartek", message: "call later" },
    ]);
    expect(recognised).toContain("email");
    expect(skipped).toBe(1);
  });

  it("returns empty for header-only input", () => {
    expect(csvToLeadRows("name,email\n").rows).toEqual([]);
  });
});
