import { describe, expect, it } from "vitest";
import { buildPlaybook, type PlaybookInput } from "@/lib/playbook";

function baseLead(over: Partial<PlaybookInput["lead"]> = {}): PlaybookInput["lead"] {
  return {
    name: "Test Lead",
    companyName: "Testowa Sp. z o.o.",
    industry: "fryzjer",
    region: "Warszawa",
    source: "GOOGLE_MAPS",
    tags: [],
    hasWebsite: null,
    auditScore: null,
    callStatus: "NOT_CALLED",
    callAttempts: 0,
    lastCallAt: null,
    score: 50,
    createdAt: new Date(),
    ...over,
  };
}

describe("buildPlaybook", () => {
  it("leads with the no-website angle when there is no site", () => {
    const pb = buildPlaybook({
      lead: baseLead({ hasWebsite: false, tags: ["no-website"] }),
      emailsSent: 0,
    });
    expect(pb.angles[0].title).toContain("No website");
    expect(pb.angles[0].power).toBe("high");
    expect(pb.opener).toContain("couldn't find one");
  });

  it("quotes the real load time from the audit", () => {
    const pb = buildPlaybook({
      lead: baseLead({ hasWebsite: true, auditScore: 31 }),
      audit: { overall: 31, loadTimeMs: 8400, https: false, mobileFriendly: false, issues: [] },
      emailsSent: 0,
    });
    expect(pb.angles.some((a) => a.title.includes("8.4s"))).toBe(true);
    expect(pb.angles.some((a) => a.title.includes("Not secure"))).toBe(true);
  });

  it("adapts next moves to the call status", () => {
    const interested = buildPlaybook({
      lead: baseLead({ callStatus: "INTERESTED", callAttempts: 1, hasWebsite: false }),
      emailsSent: 1,
    });
    expect(interested.moves[0].title).toContain("24h");

    const noAnswer = buildPlaybook({
      lead: baseLead({ callStatus: "NO_ANSWER", callAttempts: 2 }),
      emailsSent: 1,
    });
    expect(noAnswer.moves.some((m) => m.title.includes("time slot"))).toBe(true);
    // 3 touches so far → persistence reminder appears
    expect(noAnswer.moves.some((m) => m.detail.includes("93%"))).toBe(true);
  });

  it("marks contact-status checklist correctly", () => {
    const pb = buildPlaybook({
      lead: baseLead({ callAttempts: 2, callStatus: "MEETING_BOOKED" }),
      stageName: "Proposal",
      emailsSent: 3,
    });
    const byLabel = Object.fromEntries(pb.status.map((s) => [s.label, s.done]));
    expect(byLabel["Called"]).toBe(true);
    expect(byLabel["Email sent"]).toBe(true);
    expect(byLabel["Meeting booked"]).toBe(true);
    expect(byLabel["Proposal sent"]).toBe(true);
  });
});
