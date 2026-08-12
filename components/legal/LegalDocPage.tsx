import type { LegalDoc } from '@/lib/legal/content';

/**
 * Shared renderer for the hosted legal pages (/terms, /privacy).
 *
 * Renders the same `LegalSection[]` shape the mobile app's LegalReader modal
 * uses (see `lib/legal/content.ts`), styled with the app's tokens. Kept in
 * one place so both pages stay visually identical.
 */
export function LegalDocPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold">{doc.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Last updated: August 11, 2026
        </p>
      </header>

      <p className="text-muted-foreground mb-8 leading-relaxed">{doc.intro}</p>

      <div className="space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.paragraphs?.map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
            {section.bullets?.map((bullet, i) => (
              <ul key={i} className="list-disc pl-6">
                <li className="text-muted-foreground leading-relaxed">
                  {bullet}
                </li>
              </ul>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
