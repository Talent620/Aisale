import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth, serverError, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Revoke a key (kept for the audit trail, never usable again). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const a = await getAuth();
  if ("res" in a) return a.res;
  if (a.ctx.role === "MEMBER") return err("Only owners/admins can manage API keys", 403);

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: params.id, companyId: a.ctx.companyId },
      select: { id: true },
    });
    if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e, "api-keys.DELETE");
  }
}
