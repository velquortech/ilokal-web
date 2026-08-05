import Link from 'next/link';
import { ArrowRight, Check, Store } from 'lucide-react';
import {
  Eyebrow,
  Lede,
  SectionTitle,
} from '@/app/home/components/landing/primitives';
import { STEP_FIELDS, PREREQUISITES, FAQ } from './data';
import type { RegistrationStepMeta } from '@/app/business/registration/data/stepMeta';

/**
 * Sections for `/for-business`.
 *
 * All server components — there is nothing here to click except links, and the
 * FAQ is native `<details>`, so the page ships no JavaScript of its own.
 *
 * Deliberately NOT using the landing's `.il-reveal` scroll animations: those
 * rules are scoped to `[data-ilokal-root]` (`landing.css:70`), which this page
 * is not inside, so they would silently do nothing. A page whose only motion is
 * hover and focus is also the right amount of motion for a page someone reads
 * once before filling in a form.
 *
 * Type/colour comes from the landing primitives and brand v1.0 tokens. Headings
 * pick up Pally from `@layer base`, so no `font-display` here.
 */

export function Hero({
  ctaHref,
  ctaLabel,
  ctaNote,
  stepCount,
}: {
  ctaHref: string;
  ctaLabel: string;
  /** Shown when a signed-in CUSTOMER needs a business account first. */
  ctaNote?: string;
  /** From the wizard, so the prose cannot claim four while the spine shows five. */
  stepCount: number;
}) {
  return (
    <section className="pt-6 pb-14 sm:pt-10 sm:pb-20">
      <Eyebrow>For businesses</Eyebrow>
      {/* `h1`: nothing in `PublicShell` renders one, and this is an indexed
          marketing page. */}
      <SectionTitle
        as="h1"
        className="mt-5 max-w-3xl text-[#1A1A1A] dark:text-[#F7F5EF]"
      >
        Put your shop where Ilonggos are already looking.
      </SectionTitle>
      <Lede className="mt-6 max-w-xl">
        Registering takes about ten minutes and {stepCount} short steps. Here is
        exactly what you will be asked for, so you can gather it first and
        finish in one sitting.
      </Lede>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          className="group bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#what-you-need"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full px-4 py-3.5 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          See what you need
        </a>
      </div>

      {ctaNote && (
        <p className="text-muted-foreground mt-3 text-sm">{ctaNote}</p>
      )}
    </section>
  );
}

/**
 * The one warm block on the page — Cornsilk with Charcoal type, which measures
 * 14.12:1. Every number in it is enforced by the form: 2 MB per file, four
 * photos minimum, and a map pin that `nearby_businesses` filters on.
 */
export function Prerequisites({
  requireDocuments,
}: {
  requireDocuments: boolean;
}) {
  return (
    <section id="what-you-need" className="scroll-mt-24 pb-14 sm:pb-20">
      {/* Cornsilk with Charcoal type is 14.12:1. In dark mode it hands over to
          the card token rather than a one-off hex — the palette has no dark
          Cornsilk, and inventing one is how a colour ends up in no ledger. */}
      <div className="dark:bg-card dark:text-card-foreground rounded-3xl bg-[#FEF8D6] p-7 text-[#1A1A1A] sm:p-10">
        <h3 className="text-2xl font-bold tracking-tight">Before you start</h3>
        <p className="mt-2 text-[0.9375rem] opacity-80">
          Have these ready and the form is a ten-minute job.
        </p>

        <ul className="mt-7 space-y-4">
          {PREREQUISITES.map((item) => (
            <li key={item.label} className="flex items-start gap-3.5">
              <span
                aria-hidden
                // `bg-primary`, not the raw hex: `#D70005` measures 3.23:1 on
                // a dark surface, and `--primary` already lifts to `#DD2920`
                // under `.dark`.
                className="bg-primary text-primary-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span>
                <span className="block text-[0.9375rem] font-semibold">
                  {item.label}
                </span>
                <span className="block text-[0.9375rem] opacity-75">
                  {item.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* Read from the flag, never hardcoded: the Documents step appears the
            day an admin turns `require_business_documents` on, and a page
            promising "no paperwork" would start lying that morning. */}
        <p className="mt-7 border-t border-current/10 pt-5 text-[0.9375rem] font-medium">
          {requireDocuments
            ? 'You will also be asked for your business permit and tax certificate.'
            : 'No permits or paperwork — not for now.'}
        </p>
      </div>
    </section>
  );
}

/**
 * The spine: the wizard's own steps, with the fields each one asks for.
 *
 * Numbering earns its place because this is a real sequence — the same
 * argument the landing's business block makes for its `<ol>`, which is why
 * that block stays a three-line teaser and does not repeat these.
 */
export function StepSpine({ steps }: { steps: RegistrationStepMeta[] }) {
  return (
    <section className="pb-14 sm:pb-20">
      <SectionTitle as="h3" className="text-[#1A1A1A] dark:text-[#F7F5EF]">
        {steps.length} steps, start to finish.
      </SectionTitle>

      <ol className="mt-9 space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="bg-card ring-border flex flex-col gap-5 rounded-2xl p-6 ring-1 sm:flex-row sm:p-7"
          >
            <span
              aria-hidden
              className="text-primary/35 shrink-0 text-4xl leading-none font-bold tabular-nums"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">{step.title}</p>
              <p className="text-muted-foreground mt-1 text-[0.9375rem]">
                {step.description}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {STEP_FIELDS[step.id].map((field) => (
                  <li
                    key={field}
                    className="bg-muted text-muted-foreground rounded-md px-2.5 py-1 font-mono text-xs"
                  >
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * What happens on submit — forked on the real flag.
 *
 * `auto_verify_businesses` is seeded true, so on a default install the shop is
 * already published by the time the success dialog paints. The dialog was fixed
 * for exactly this; promising a 24–48 hour review on an indexed public page
 * would be the same lie with a bigger audience.
 */
export function AfterSubmit({ autoVerify }: { autoVerify: boolean }) {
  return (
    <section className="pb-14 sm:pb-20">
      <div className="border-border flex flex-col gap-5 rounded-2xl border border-dashed p-7 sm:flex-row sm:items-start sm:p-8">
        <span
          aria-hidden
          className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full"
        >
          <Store className="size-5" />
        </span>
        <div>
          <h3 className="text-xl font-bold tracking-tight">
            {autoVerify
              ? 'Your shop goes live right away'
              : 'Then we review it'}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xl text-[0.9375rem] leading-relaxed">
            {autoVerify
              ? 'Submit, and your shop is published — shoppers can find it, follow it and redeem your deals the same day. Your dashboard opens on a short checklist for the finishing touches: opening hours, your first offering, your first deal.'
              : 'We check your details and publish your shop once it is approved. You will get a notification either way, and you can keep working on your offerings and deals while you wait.'}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Native `<details>` rather than an accordion component: it is keyboard
 * accessible, searchable by the browser's find-in-page, and works with no
 * JavaScript — which is the whole budget this page needs.
 */
export function Faq() {
  return (
    <section className="pb-14 sm:pb-20">
      <SectionTitle as="h3" className="text-[#1A1A1A] dark:text-[#F7F5EF]">
        Questions owners ask
      </SectionTitle>

      <div className="divide-border mt-8 divide-y border-y">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="focus-visible:ring-ring flex cursor-pointer items-center justify-between gap-4 rounded-md text-[0.9375rem] font-medium focus-visible:ring-2 focus-visible:outline-hidden">
              {item.question}
              <span
                aria-hidden
                className="text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="text-muted-foreground mt-3 max-w-2xl text-[0.9375rem] leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta({
  ctaHref,
  ctaLabel,
  stepCount,
}: {
  ctaHref: string;
  ctaLabel: string;
  stepCount: number;
}) {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="bg-primary text-primary-foreground flex flex-col items-start gap-6 rounded-3xl p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Ready when you are.
          </h3>
          <p className="mt-2 max-w-md text-[0.9375rem] opacity-90">
            Ten minutes, {stepCount} steps, and your shop is on the map.
          </p>
        </div>
        <Link
          href={ctaHref}
          // Ring and offset both spelled out: a white ring on the default
          // white offset, over a Brick Ember card, reads as a size change
          // rather than a focus indicator.
          className="group bg-background text-foreground hover:bg-background/90 focus-visible:ring-foreground focus-visible:ring-offset-primary inline-flex shrink-0 items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
