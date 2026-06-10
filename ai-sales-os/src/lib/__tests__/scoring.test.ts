import { describe, expect, it } from "vitest";
import { scoreLead } from "@/lib/scoring";
import type { Lead } from "@prisma/client";

function lead(over: Partial<Lead> = {}): Lead {
  return {
    source: "OTHER",
    priority: "MEDIUM",
    outcome: "OPEN",
    budget: null,
    estimatedValue: null,
    email: null,
    phone: null,
    companyName: null,
    industry: null,
    lastContactedAt: null,
    expectedCloseAt: null,
    createdAt: new Date(),
    ...over,
  } as Lead;
}

describe("scoring", () => {
  it("scores within 0..100 with a grade and breakdown", () => {
    const r = scoreLead(lead());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D"]).toContain(r.grade);
    expect(Object.keys(r.breakdown).length).toBeGreaterThan(0);
  });

  it("ranks a rich referral above a bare cold lead", () => {
    const rich = scoreLead(
      lead({
        source: "REFERRAL",
        priority: "URGENT",
        budget: 50_000,
        estimatedValue: 60_000,
        email: "a@b.pl",
        phone: "+48 600 000 000",
        companyName: "Firma",
        industry: "Manufacturing",
        lastContactedAt: new Date(),
      }),
    );
    const bare = scoreLead(lead({ source: "COLD_OUTREACH", priority: "LOW" }));
    expect(rich.score).toBeGreaterThan(bare.score);
  });

  it("gives Google Maps sourced leads a meaningful source bonus", () => {
    const maps = scoreLead(lead({ source: "GOOGLE_MAPS" }));
    const other = scoreLead(lead({ source: "OTHER" }));
    expect(maps.score).toBeGreaterThan(other.score);
  });
});
