import type { LegalDoc } from '@/lib/legal/content';

/**
 * Renders a hosted legal document.
 *
 * A server component with no state and no client JavaScript: a privacy policy
 * is the one page that must render for a Play reviewer, a crawler, or someone
 * on a bad connection, without depending on hydration.
 *
 * Sections carry real heading levels (`h2`) under the page's single `h1`, so
 * the document is navigable with a screen reader's heading list — which is how
 * anyone actually reads a policy this long.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {doc.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          Last updated:{' '}
          {/* A machine-readable date beside the human one: crawlers and
              reviewers both look for when a policy last changed. */}
          <time dateTime={toIsoDate(doc.lastUpdated)}>{doc.lastUpdated}</time>
        </p>
      </header>

      <p className="text-muted-foreground mt-6 leading-relaxed">{doc.intro}</p>

      <div className="mt-10 space-y-8">
        {doc.sections.map((section, index) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              {/* Numbered because the sections are cross-referenced in support
                  replies ("see section 11"), matching the .md source. */}
              <span className="text-muted-foreground mr-2 tabular-nums">
                {index + 1}.
              </span>
              {section.heading}
            </h2>

            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="text-muted-foreground leading-relaxed"
              >
                {paragraph}
              </p>
            ))}

            {section.bullets && section.bullets.length > 0 && (
              <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

/**
 * "August 11, 2026" -> "2026-08-11" for the `datetime` attribute.
 *
 * Returns an empty string rather than throwing on an unparseable date: a
 * malformed constant should cost the machine-readable attribute, not the whole
 * policy page.
 *
 * 🔴 Built from the LOCAL calendar fields, never `toISOString()`. A bare date
 * string parses to local MIDNIGHT, so converting it to UTC moves it backwards
 * anywhere east of Greenwich — in Asia/Manila (UTC+8) this rendered
 * `datetime="2026-08-10"` beside the visible text "August 11, 2026", i.e. the
 * machine-readable date contradicting the human one on the page whose whole
 * job is to say when the policy last changed. The parsed value's local fields
 * are already exactly what the string said, in every timezone.
 */
function toIsoDate(value: string | undefined): string {
  // `lastUpdated` is optional on the shared LegalDoc shape (the privacy
  // policy predates the field); an absent date costs the machine-readable
  // attribute, not the page.
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
