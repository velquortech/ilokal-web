import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ROUTES, businessShopPath } from '@/config/routeConfig';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { getBusinessGallery } from '@/lib/api/business/businessQuery';
import { PageHeader } from '@/components/custom/PageHeader';
import { Button } from '@/components/ui/button';
import { GalleryManager } from './components/GalleryManager';

type Params = Promise<{ businessId: string }>;

export const metadata = { title: 'Shop gallery' };

export default async function ShopGalleryPage({ params }: { params: Params }) {
  const { businessId } = await params;

  // The layout already gates the segment, but a page is its own entry point and
  // this one hands a business id to a write path.
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized) {
    const err = verify.error;
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'AUTHENTICATION_ERROR'
    ) {
      redirect(ROUTES.AUTH.SIGN_IN);
    }
    notFound();
  }

  const gallery = await getBusinessGallery(businessId);
  // A read that failed is NOT a missing shop — only the second one 404s.
  if (!gallery.failed && !gallery.found) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href={businessShopPath(businessId)}>
            <ArrowLeft />
            Back to your shop page
          </Link>
        </Button>
        <PageHeader
          title="Shop gallery"
          lede="The photos customers see when they open your shop on iLokal."
        />
      </div>

      <GalleryManager
        businessId={businessId}
        initialImages={gallery.images}
        loadFailed={gallery.failed}
      />
    </div>
  );
}
