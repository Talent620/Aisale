import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureInboundIntegration } from "@/lib/acquisition/token";
import { LandingForm } from "@/components/landing/landing-form";

export const dynamic = "force-dynamic";

async function findCompany(slug: string) {
  return prisma.company.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, name: true, industry: true, website: true, slug: true },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const company = await findCompany(params.slug);
  return {
    title: company ? `${company.name} — Get in touch` : "Get in touch",
    robots: { index: true },
  };
}

/**
 * Public landing page (no login): a clean lead-capture page per company,
 * the destination for Social Studio ads and any external campaign. Submits
 * through the public capture endpoint with the GDPR consent recorded.
 */
export default async function LandingPage({ params }: { params: { slug: string } }) {
  const company = await findCompany(params.slug);
  if (!company) notFound();

  const integ = await ensureInboundIntegration(company.id);
  const token = String((integ.config as Record<string, unknown> | null)?.token ?? "");

  const benefits = [
    "Free, no-obligation consultation",
    "Concrete recommendations within 24 hours",
    "We reply the same business day",
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-5xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center">
        <section className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">{company.name}</p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground">
            More customers{company.industry ? ` for your ${company.industry.toLowerCase()} business` : " for your business"}, starting this week.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Leave your details and we&apos;ll get back to you with a concrete plan — no fluff,
            no commitment.
          </p>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-semibold">Get your free consultation</h2>
          <p className="mt-1 text-sm text-muted-foreground">Takes 30 seconds. We&apos;ll do the rest.</p>
          <div className="mt-6">
            <LandingForm
              token={token}
              consentSource={`landing:${company.slug ?? company.id}`}
              companyName={company.name}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
