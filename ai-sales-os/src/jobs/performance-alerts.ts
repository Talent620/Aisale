import { prisma } from "@/lib/prisma";
import { computeSnapshot } from "@/lib/metrics";
import type { JobContext } from "./runner";

const REPLY_RATE_FLOOR = 15;

/**
 * Watch headline performance and raise an alert + a funnel suggestion when the
 * reply rate drops below a healthy floor. Deduped to one open alert per day.
 */
export async function performanceAlerts({ companyId }: JobContext) {
  const snapshot = await computeSnapshot(companyId);
  if (snapshot.replyRate >= REPLY_RATE_FLOOR) return { raised: false };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const recent = await prisma.notification.findFirst({
    where: { companyId, type: "PERFORMANCE_ALERT", createdAt: { gte: since } },
    select: { id: true },
  });
  if (recent) return { raised: false };

  await prisma.notification.createMany({
    data: [
      {
        companyId,
        type: "PERFORMANCE_ALERT" as const,
        title: "Wskaźnik odpowiedzi poniżej celu",
        body: `Wskaźnik odpowiedzi: ${snapshot.replyRate}% (cel ≥ ${REPLY_RATE_FLOOR}%). Treść wiadomości lub targetowanie wymaga uwagi.`,
        link: "/analytics",
      },
      {
        companyId,
        type: "FUNNEL_SUGGESTION" as const,
        title: "Sugestia dla lejka",
        body: "Zaostrz pierwsze zdanie i personalizuj hak pod segment — to zwykle najszybciej podnosi odpowiedzi.",
        link: "/generator",
      },
    ],
  });

  return { raised: true };
}
