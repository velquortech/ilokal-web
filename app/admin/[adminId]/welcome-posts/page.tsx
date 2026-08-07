import { PageHeader } from '@/components/custom/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { getWelcomePostCandidates } from '@/lib/api/admin/analyticsQuery';
import { hasBrandFont } from '@/lib/og/fonts';
import { PostComposer } from './components/post-composer';

/**
 * Compose a "Welcome to the iLokal family!" post for one or two shops.
 *
 * Download only — no storage and no schema. The admin posts the PNG by hand to
 * Facebook, Instagram, Threads or LinkedIn.
 */
export default async function WelcomePostsPage({
  searchParams,
}: {
  // `string[]` for a repeated `?ids=a&ids=b`. Typing it `string` and calling
  // `.split` on it threw straight into `error.tsx` — a crash reachable by
  // editing the URL.
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const [{ ids }, candidates, brandFontAvailable] = await Promise.all([
    searchParams,
    getWelcomePostCandidates(),
    hasBrandFont(),
  ]);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader
        title="Welcome posts"
        lede="Generate a launch card for newly registered shops"
      />

      {candidates.failed ? (
        // Outage and "nobody has registered" look identical otherwise, and one
        // of them is worth retrying.
        <Card className="border-destructive/40">
          <CardContent className="text-muted-foreground py-6 text-sm">
            We couldn’t load the shop list. Refresh in a moment.
          </CardContent>
        </Card>
      ) : (
        <PostComposer
          candidates={candidates.rows}
          initialIds={[ids ?? ''].flat().join(',').split(',').filter(Boolean)}
          brandFontAvailable={brandFontAvailable}
        />
      )}
    </div>
  );
}
