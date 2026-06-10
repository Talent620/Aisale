import { redirect } from "next/navigation";
import { getAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { formatCurrency } from "@/lib/utils";
import { Kanban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const a = await getAuth();
  if ("res" in a) redirect("/login");
  const { companyId } = a.ctx;

  const [stages, leads] = await Promise.all([
    prisma.funnelStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, probability: true },
    }),
    prisma.lead.findMany({
      where: { companyId, deletedAt: null, outcome: "OPEN" },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        companyName: true,
        estimatedValue: true,
        score: true,
        scoreGrade: true,
        priority: true,
        stageId: true,
      },
    }),
  ]);

  const pipelineValue = leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);

  // Polish plural forms for "otwarta transakcja"
  const n = leads.length;
  const dealsWord =
    n === 1
      ? "otwarta transakcja"
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
        ? "otwarte transakcje"
        : "otwartych transakcji";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lejek"
        description={`${n} ${dealsWord} · ${formatCurrency(pipelineValue)} w grze`}
      />

      {stages.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Brak etapów lejka"
          description="Etapy lejka są tworzone automatycznie podczas konfiguracji Twojego workspace'u."
        />
      ) : (
        <PipelineBoard stages={stages} leads={leads} />
      )}
    </div>
  );
}
