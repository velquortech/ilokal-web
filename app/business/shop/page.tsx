'use client';

import { useBusinessShop } from '@/providers/BusinessProvider';
import { CustomerLoveSection } from './components/customer-love';
import { ShopBanner } from './components/shop-banner';
import { ShopGallery } from './components/shop-gallery';
import { ShopItems } from './components/shop-items';
import { ShopLegitimacy } from './components/shop-legitimacy';

export default function MyShopPage() {
  const { business } = useBusinessShop();

  return (
    <div className="font-giest flex h-max flex-1 flex-col pb-8">
      <ShopBanner business={business} />
      <div className="mt-8 flex flex-1 flex-col space-y-20">
        <ShopGallery business={business} />
        <ShopItems business={business} />
        <CustomerLoveSection business={business} />
        <ShopLegitimacy business={business} />
      </div>
    </div>
  );
}
