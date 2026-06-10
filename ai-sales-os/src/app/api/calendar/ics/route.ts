import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyByToken } from "@/lib/acquisition/token";

export const dynamic = "force-dynamic";

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * iCalendar feed — subscribe in Google Calendar / Outlook / Apple Calendar:
 *   <APP_URL>/api/calendar/ics?token=<inbound capture token>
 * Events: open tasks with a due date + scheduled callbacks (lead.nextCallAt).
 * Uses the same per-company token as the public capture endpoint (read-only).
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const company = await resolveCompanyByToken(token);
  if (!company) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const horizon = new Date(Date.now() - 7 * 86_400_000); // include last week
  const [tasks, callbacks] = await Promise.all([
    prisma.task.findMany({
      where: {
        companyId: company.companyId,
        deletedAt: null,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { gte: horizon },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
      include: { lead: { select: { name: true } } },
    }),
    prisma.lead.findMany({
      where: {
        companyId: company.companyId,
        deletedAt: null,
        outcome: "OPEN",
        nextCallAt: { gte: horizon },
      },
      orderBy: { nextCallAt: "asc" },
      take: 200,
      select: { id: true, name: true, phone: true, nextCallAt: true },
    }),
  ]);

  const now = icsDate(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Sales OS//Tasks & Calls//EN",
    "X-WR-CALNAME:AI Sales OS",
    "CALSCALE:GREGORIAN",
  ];

  for (const t of tasks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@ai-sales-os`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(t.dueDate!)}`,
      `DTEND:${icsDate(new Date(t.dueDate!.getTime() + 30 * 60_000))}`,
      `SUMMARY:${icsEscape(`Task: ${t.title}`)}`,
      ...(t.lead ? [`DESCRIPTION:${icsEscape(`Lead: ${t.lead.name}`)}`] : []),
      "END:VEVENT",
    );
  }
  for (const l of callbacks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:call-${l.id}@ai-sales-os`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(l.nextCallAt!)}`,
      `DTEND:${icsDate(new Date(l.nextCallAt!.getTime() + 15 * 60_000))}`,
      `SUMMARY:${icsEscape(`Call: ${l.name}${l.phone ? ` (${l.phone})` : ""}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ai-sales-os.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
