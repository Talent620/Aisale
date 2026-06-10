import { redirect } from "next/navigation";
import { getAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { ApiAccessCard } from "@/components/settings/api-access-card";
import { ensureInboundIntegration } from "@/lib/acquisition/token";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const a = await getAuth();
  if ("res" in a) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: a.ctx.companyId },
    include: {
      integrations: { orderBy: { type: "asc" } },
      _count: { select: { users: true, leads: true } },
    },
  });

  if (!company) redirect("/login");

  const [apiKeys, inbound] = await Promise.all([
    prisma.apiKey.findMany({
      where: { companyId: a.ctx.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    }),
    ensureInboundIntegration(a.ctx.companyId),
  ]);
  const inboundToken = String((inbound.config as Record<string, unknown> | null)?.token ?? "");
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <PageHeader title="Ustawienia" description="Zarządzaj swoim workspace i zachowaniem AI." />
      <SettingsClient
        company={{
          name: company.name,
          industry: company.industry,
          website: company.website,
          timezone: company.timezone,
          currency: company.currency,
          aiContext: company.aiContext,
          integrations: company.integrations.map((i) => ({
            id: i.id,
            type: i.type,
            provider: i.provider,
            status: i.status,
          })),
          _count: company._count,
        }}
      />
      <ApiAccessCard
        keys={apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          revokedAt: k.revokedAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))}
        appUrl={appUrl}
        inboundToken={inboundToken}
        landingSlug={company.slug}
      />
    </div>
  );
}
