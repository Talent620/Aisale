import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth, parseBody, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await getAuth();
  if ("res" in a) return a.res;
  try {
    const segments = await prisma.segment.findMany({
      where: { companyId: a.ctx.companyId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(segments);
  } catch (e) {
    return serverError(e, "segments.GET");
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  /** Optionally attach leads right away. */
  leadIds: z.array(z.string().cuid()).max(500).default([]),
});

export async function POST(req: Request) {
  const a = await getAuth();
  if ("res" in a) return a.res;

  const b = await parseBody(req, createSchema);
  if ("res" in b) return b.res;

  try {
    const segment = await prisma.segment.create({
      data: {
        companyId: a.ctx.companyId,
        name: b.data.name,
        description: b.data.description ?? null,
        color: b.data.color ?? "#0f766e",
        ...(b.data.leadIds?.length
          ? { leads: { connect: b.data.leadIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { _count: { select: { leads: true } } },
    });
    return NextResponse.json(segment, { status: 201 });
  } catch (e) {
    return serverError(e, "segments.POST");
  }
}
