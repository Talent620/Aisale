import { redirect } from "next/navigation";
import { getAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { computeSnapshot } from "@/lib/metrics";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CopilotClient } from "@/components/copilot/copilot-client";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const a = await getAuth();
  if ("res" in a) redirect("/login");
  const { companyId } = a.ctx;

  const [company, snapshot] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
    computeSnapshot(companyId),
  ]);

  const greeting =
    `Cześć! Jestem Twoim copilotem sprzedaży dla ${company?.name ?? "Twojego workspace"}. ` +
    `Masz obecnie ${snapshot.totalLeads} leadów (${snapshot.hotLeads} gorących), ` +
    `${snapshot.openTasks} otwartych zadań${
      snapshot.overdueTasks ? ` — ${snapshot.overdueTasks} po terminie` : ""
    } oraz ${formatCurrency(snapshot.pipelineValue, snapshot.currency)} w lejku. ` +
    `Zapytaj mnie, co priorytetyzować, a przeanalizuję Twoje dane na żywo.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Copilot AI"
        description="Twój zawsze dostępny strateg — zapytaj o cokolwiek dotyczącego Twojego lejka."
      />
      <CopilotClient greeting={greeting} />
    </div>
  );
}
