import { notFound } from 'next/navigation';
import { getBusinessById } from '@/lib/api/business/business';
import { getProductsByBusinessId } from '@/lib/api/products/productQuery';
import { getBranchById } from '@/lib/api/branches/branchQuery';
import { CustomerLoveSection } from './components/customer-love';
import { ShopBanner } from './components/shop-banner';
import { ShopGallery } from './components/shop-gallery';
import { ShopItems } from './components/shop-items';
import { ShopLegitimacy } from './components/shop-legitimacy';
import type { Branch, ProductResponse } from '@/lib/types';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ businessId }, sp] = await Promise.all([params, searchParams]);
  const branchId = typeof sp.branch === 'string' ? sp.branch : undefined;

  const [business, productsResult, branchResult] = await Promise.all([
    getBusinessById(businessId),
    getProductsByBusinessId(businessId, 'active', branchId),
    branchId ? getBranchById(branchId) : Promise.resolve(null),
  ]);

  if (!business) notFound();

  const products: ProductResponse[] =
    'products' in productsResult ? (productsResult.products ?? []) : [];

  const branch: Branch | null =
    branchResult && 'branch' in branchResult
      ? (branchResult.branch as Branch)
      : null;

  return (
    <div className="font-giest flex h-max flex-1 flex-col pb-8">
      <ShopBanner business={business} branch={branch} />
      <div className="mt-8 flex flex-1 flex-col space-y-20">
        <ShopGallery business={business} branch={branch} />
        <ShopItems business={business} products={products} />
        <CustomerLoveSection business={business} />
        <ShopLegitimacy business={business} />
      </div>
    </div>
  );
}
