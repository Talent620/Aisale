import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource } from "@prisma/client";
import { getAuth, parseBody, serverError } from "@/lib/api";
import { csvToLeadRows } from "@/lib/csv";
import { ingestLead } from "@/lib/acquisition/ingest";
import { notify } from "@/lib/activity";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  source: z.nativeEnum(LeadSource).default(LeadSource.OTHER),
  /** Operator confirms these contacts gave marketing consent. */
  marketingConsent: z.boolean().default(false),
  tags: z.array(z.string().trim().max(40)).max(10).default([]),
});

const MAX_ROWS = 500;

/** Import leads from CSV text through the shared ingest pipeline. */
export async function POST(req: Request) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  const b = await parseBody(req, importSchema);
  if ("res" in b) return b.res;

  try {
    const { rows, recognised, skipped } = csvToLeadRows(b.data.csv);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No importable rows — the file needs a header row with at least a name, email or phone column" },
        { status: 422 },
      );
    }

    let created = 0;
    let deduped = 0;
    for (const row of rows.slice(0, MAX_ROWS)) {
      const r = await ingestLead({
        companyId: a.ctx.companyId,
        input: {
          name: row.name ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          companyName: row.companyName ?? null,
          website: row.website ?? null,
          industry: row.industry ?? null,
          region: row.region ?? null,
          position: row.position ?? null,
          message: row.message ?? null,
        },
        source: b.data.source ?? "OTHER",
        sourceDetail: "CSV import",
        tags: ["csv-import", ...(b.data.tags ?? [])],
        autoDraft: false,
        silent: true,
        marketingConsent: b.data.marketingConsent ?? false,
        consentSource: "csv-import",
      });
      if (r.deduped) deduped++;
      else created++;
    }

    if (created > 0) {
      await notify({
        companyId: a.ctx.companyId,
        type: "SYSTEM",
        title: `CSV import: ${created} new lead${created === 1 ? "" : "s"}`,
        body: `${deduped ? `${deduped} duplicate(s) merged · ` : ""}columns: ${recognised.join(", ")}`,
        link: "/leads",
      });
    }

    return NextResponse.json({
      created,
      deduped,
      skipped,
      truncated: Math.max(0, rows.length - MAX_ROWS),
      recognisedColumns: recognised,
    });
  } catch (err) {
    return serverError(err, "leads.import");
  }
}
