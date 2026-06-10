import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-keys";
import { ingestLead } from "@/lib/acquisition/ingest";

export const dynamic = "force-dynamic";

/**
 * Public REST API v1 — authenticate with `Authorization: Bearer sk_live_…`
 * (keys are created in Settings → API access). Lets external tools (Zapier,
 * Make, custom scripts, another CRM) read and create leads.
 */

function unauthorized() {
  return NextResponse.json(
    { error: "Missing or invalid API key. Send 'Authorization: Bearer sk_live_…'." },
    { status: 401 },
  );
}

/** GET /api/v1/leads?status=OPEN&source=GOOGLE_MAPS&q=…&limit=50&offset=0 */
export async function GET(req: Request) {
  const auth = await verifyApiKey(req);
  if (!auth) return unauthorized();

  const p = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(p.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(p.get("offset")) || 0, 0);
  const q = p.get("q")?.trim();

  const where: Prisma.LeadWhereInput = {
    companyId: auth.companyId,
    deletedAt: null,
    ...(p.get("status") ? { outcome: p.get("status") as never } : {}),
    ...(p.get("source") ? { source: p.get("source") as never } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true, name: true, email: true, phone: true, companyName: true,
        website: true, industry: true, region: true, source: true,
        sourceDetail: true, score: true, scoreGrade: true, outcome: true,
        callStatus: true, hasWebsite: true, auditScore: true, tags: true,
        marketingConsent: true, consentAt: true, consentSource: true,
        estimatedValue: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ total, limit, offset, leads });
}

const createSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(40).optional(),
    companyName: z.string().trim().max(200).optional(),
    website: z.string().trim().max(300).optional(),
    industry: z.string().trim().max(120).optional(),
    region: z.string().trim().max(120).optional(),
    position: z.string().trim().max(120).optional(),
    message: z.string().trim().max(4000).optional(),
    source: z.nativeEnum(LeadSource).default(LeadSource.OTHER),
    sourceDetail: z.string().trim().max(120).optional(),
    tags: z.array(z.string().trim().max(40)).max(10).default([]),
    marketingConsent: z.boolean().default(false),
    consentSource: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.name || d.email || d.phone, {
    message: "Provide at least a name, email or phone",
  });

/** POST /api/v1/leads — create (or dedupe-merge) a lead. */
export async function POST(req: Request) {
  const auth = await verifyApiKey(req);
  if (!auth) return unauthorized();

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const r = await ingestLead({
    companyId: auth.companyId,
    input: {
      name: d.name ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      companyName: d.companyName ?? null,
      website: d.website ?? null,
      industry: d.industry ?? null,
      region: d.region ?? null,
      position: d.position ?? null,
      message: d.message ?? null,
    },
    source: d.source ?? "OTHER",
    sourceDetail: d.sourceDetail ?? "API v1",
    tags: ["api", ...(d.tags ?? [])],
    autoDraft: false,
    silent: true,
    marketingConsent: d.marketingConsent ?? false,
    consentSource: d.consentSource ?? "api",
  });

  return NextResponse.json(
    { id: r.leadId, deduped: r.deduped, score: r.score, grade: r.grade },
    { status: r.deduped ? 200 : 201 },
  );
}
