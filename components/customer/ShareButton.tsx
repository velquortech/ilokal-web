'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Copies the public share link (`/s/[businessId]` — the app deep-link page)
 * via the native share sheet when available, clipboard otherwise.
 */
export function ShareButton({
  businessId,
  shopName,
}: {
  businessId: string;
  shopName: string;
}) {
  const share = async () => {
    const url = `${window.location.origin}/s/${businessId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${shopName} on iLokal`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { id: 'share-business' });
    } catch {
      // Share sheet dismissed or clipboard blocked — nothing to report.
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  );
}
