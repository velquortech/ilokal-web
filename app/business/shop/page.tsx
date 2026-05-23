import { getMyBusinesses } from '@/lib/api/business/business';
import { getProductsByBusinessId } from '@/lib/api/products/productQuery';
import { CustomerLoveSection } from './components/customer-love';
import { ShopBanner } from './components/shop-banner';
import { ShopGallery } from './components/shop-gallery';
import { ShopItems } from './components/shop-items';
import { ShopLegitimacy } from './components/shop-legitimacy';
import type { ProductResponse } from '@/lib/types';

export default async function MyShopPage() {
  const business = await getMyBusinesses();

  const productsResult = business?.id
    ? await getProductsByBusinessId(business.id, 'active', 10)
    : null;

  const products: ProductResponse[] =
    productsResult && 'products' in productsResult
      ? (productsResult.products ?? [])
      : [];

  return (
    <div className="font-giest flex h-max flex-1 flex-col pb-8">
      <ShopBanner business={business} />
      <div className="mt-8 flex flex-1 flex-col space-y-20">
        <ShopGallery business={business} />
        <ShopItems business={business} products={products} />
        <CustomerLoveSection business={business} />
        <ShopLegitimacy business={business} />
      </div>
    </div>
  );
}
