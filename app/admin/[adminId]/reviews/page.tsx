import { getReviewModerationQueue } from '@/lib/api/admin/reviewModerationQuery';
import { PageHeader } from '@/components/custom/PageHeader';
import { ReviewModerationContent } from './components/review-moderation-content';

export const dynamic = 'force-dynamic';

/**
 * Admin review moderation. Reported reviews wait here until an admin hides or
 * removes them (three distinct reporters auto-hide one first); hidden and
 * removed reviews can be restored. Every rule is in the
 * `moderate_business_rating` RPC — this page only lists and dispatches.
 */
export default async function ReviewModerationPage() {
  const queue = await getReviewModerationQueue();

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-6">
      <PageHeader
        title="Reviews"
        lede="Reported reviews wait here for a decision. Three reports hide a review automatically; you can restore it or remove it for good."
      />
      <ReviewModerationContent
        reported={queue.reported}
        moderated={queue.moderated}
      />
    </div>
  );
}
