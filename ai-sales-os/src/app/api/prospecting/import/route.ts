import { NextResponse } from "next/server";
import { getAuth, parseBody, serverError } from "@/lib/api";
import { prospectingImportSchema } from "@/lib/validations";
import { importBusinesses } from "@/lib/prospecting";
import { notify } from "@/lib/activity";

export const dynamic = "force-dynamic";

/** Import selected business candidates as leads (dedupe + score + audit). */
export async function POST(req: Request) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  const b = await parseBody(req, prospectingImportSchema);
  if ("res" in b) return b.res;

  try {
    const result = await importBusinesses({
      companyId: a.ctx.companyId,
      candidates: b.data.candidates.map((c) => ({
        ...c,
        signals: c.signals ?? [],
        source: c.source ?? "GOOGLE_MAPS",
        sourceDetail: c.sourceDetail ?? "Lead Finder",
      })),
      ownerId: a.ctx.userId,
      autoDraft: b.data.autoDraft ?? false,
      autoAudit: b.data.autoAudit ?? true,
    });

    if (result.created > 0) {
      await notify({
        companyId: a.ctx.companyId,
        type: "SYSTEM",
        title: `Szukaj firm: zaimportowano ${result.created}`,
        body: `${result.deduped ? `pominięte duplikaty: ${result.deduped} · ` : ""}${result.audited ? `zaudytowane strony: ${result.audited}` : ""}`,
        link: "/leads",
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return serverError(err, "prospecting.import");
  }
}
