import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeSnapshot, funnelDistribution } from "@/lib/metrics";
import { formatCurrency } from "@/lib/utils";
import type { JobContext } from "./runner";

/**
 * Build a weekly performance report: compute KPIs, write a human-readable
 * narrative, persist a Report row and notify the team it's ready.
 */
export async function generateWeeklyReport({ companyId }: JobContext) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);

  const [snapshot, funnel, newLeads, wonCount] = await Promise.all([
    computeSnapshot(companyId),
    funnelDistribution(companyId),
    prisma.lead.count({ where: { companyId, deletedAt: null, createdAt: { gte: periodStart } } }),
    prisma.lead.count({
      where: { companyId, deletedAt: null, outcome: "WON", updatedAt: { gte: periodStart } },
    }),
  ]);

  const c = snapshot.currency;
  const summary = [
    `W tym tygodniu: ${newLeads} nowych leadów, wygranych: ${wonCount}.`,
    `Lejek: ${formatCurrency(snapshot.pipelineValue, c)} w ${snapshot.totalLeads} leadach (gorących: ${snapshot.hotLeads}).`,
    `Wygrane łącznie: ${formatCurrency(snapshot.wonValue, c)}. Wskaźnik odpowiedzi: ${snapshot.replyRate}%.`,
    snapshot.overdueTasks > 0
      ? `Zaległe zadania: ${snapshot.overdueTasks} — ich wyczyszczenie to najszybsza wygrana.`
      : "Brak zaległych zadań — dyscyplina follow-upów trzyma się planu.",
  ].join(" ");

  const report = await prisma.report.create({
    data: {
      companyId,
      type: "WEEKLY",
      title: `Raport tygodniowy · ${periodStart.toLocaleDateString("pl-PL")}–${periodEnd.toLocaleDateString("pl-PL")}`,
      summary,
      data: { snapshot, funnel, newLeads, wonCount } as unknown as Prisma.InputJsonValue,
      periodStart,
      periodEnd,
    },
  });

  await prisma.notification.create({
    data: {
      companyId,
      type: "REPORT_READY",
      title: "Raport tygodniowy gotowy",
      body: summary.slice(0, 160),
      link: "/analytics",
    },
  });

  return report;
}
