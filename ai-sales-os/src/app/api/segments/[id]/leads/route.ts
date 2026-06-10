import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth, parseBody, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({
  add: z.array(z.string().cuid()).max(500).default([]),
  remove: z.array(z.string().cuid()).max(500).default([]),
});

/** Attach / detach leads on a segment. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  const b = await parseBody(req, schema);
  if ("res" in b) return b.res;

  try {
    const segment = await prisma.segment.findFirst({
      where: { id: params.id, companyId: a.ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.segment.update({
      where: { id: segment.id },
      data: {
        leads: {
          ...(b.data.add?.length ? { connect: b.data.add.map((id) => ({ id })) } : {}),
          ...(b.data.remove?.length ? { disconnect: b.data.remove.map((id) => ({ id })) } : {}),
        },
      },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return serverError(e, "segments.leads.POST");
  }
}
