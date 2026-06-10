import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuth, parseBody, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List channel costs (last 12 months). */
export async function GET() {
  const a = await getAuth();
  if ("res" in a) return a.res;
  try {
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 12, 1);
    from.setUTCHours(0, 0, 0, 0);
    const costs = await prisma.channelCost.findMany({
      where: { companyId: a.ctx.companyId, month: { gte: from } },
      orderBy: [{ month: "desc" }, { source: "asc" }],
    });
    return NextResponse.json(costs);
  } catch (e) {
    return serverError(e, "costs.GET");
  }
}

const upsertSchema = z.object({
  source: z.nativeEnum(LeadSource),
  month: z.string().regex(/^\d{4}-\d{2}$/), // "2026-06"
  amount: z.coerce.number().int().min(0).max(10_000_000),
  note: z.string().trim().max(200).optional(),
});

/** Upsert one month's spend for a channel (amount 0 keeps the row, explicit). */
export async function PUT(req: Request) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  const b = await parseBody(req, upsertSchema);
  if ("res" in b) return b.res;

  try {
    const month = new Date(`${b.data.month}-01T00:00:00.000Z`);
    const cost = await prisma.channelCost.upsert({
      where: {
        companyId_source_month: { companyId: a.ctx.companyId, source: b.data.source, month },
      },
      create: {
        companyId: a.ctx.companyId,
        source: b.data.source,
        month,
        amount: b.data.amount,
        note: b.data.note ?? null,
      },
      update: { amount: b.data.amount, note: b.data.note ?? null },
    });
    return NextResponse.json(cost);
  } catch (e) {
    return serverError(e, "costs.PUT");
  }
}
