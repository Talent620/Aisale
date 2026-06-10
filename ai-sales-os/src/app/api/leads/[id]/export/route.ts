import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GDPR data portability: download everything stored about one lead as JSON
 * (profile, consent trail, activities, notes, tasks, calls, audits, messages).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: params.id, companyId: a.ctx.companyId },
      include: {
        stage: { select: { name: true } },
        owner: { select: { name: true, email: true } },
        activities: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
        tasks: { orderBy: { createdAt: "asc" } },
        callLogs: { orderBy: { createdAt: "asc" } },
        audits: { orderBy: { createdAt: "asc" } },
        scores: { orderBy: { createdAt: "asc" } },
        campaignMsgs: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), lead }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lead-${lead.id}.json"`,
      },
    });
  } catch (err) {
    return serverError(err, "leads.export");
  }
}
