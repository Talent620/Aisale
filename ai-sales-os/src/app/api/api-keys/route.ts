import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth, parseBody, serverError, err } from "@/lib/api";
import { createApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await getAuth();
  if ("res" in a) return a.res;
  try {
    const keys = await prisma.apiKey.findMany({
      where: { companyId: a.ctx.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });
    return NextResponse.json(keys);
  } catch (e) {
    return serverError(e, "api-keys.GET");
  }
}

const createSchema = z.object({ name: z.string().trim().min(2).max(60) });

/** Create a key. The plaintext is returned ONCE — only its hash is stored. */
export async function POST(req: Request) {
  const a = await getAuth();
  if ("res" in a) return a.res;
  if (a.ctx.role === "MEMBER") return err("Only owners/admins can manage API keys", 403);

  const b = await parseBody(req, createSchema);
  if ("res" in b) return b.res;

  try {
    const { key, plaintext } = await createApiKey(a.ctx.companyId, b.data.name);
    return NextResponse.json(
      { id: key.id, name: key.name, prefix: key.prefix, createdAt: key.createdAt, plaintext },
      { status: 201 },
    );
  } catch (e) {
    return serverError(e, "api-keys.POST");
  }
}
