import { CustomerLoveSection } from './components/customer-love';
import { ShopBanner } from './components/shop-banner';
import { ShopGallery } from './components/shop-gallery';
import { ShopItems } from './components/shop-items';
import { ShopLegitimacy } from './components/shop-legitimacy';

export default function MyShopPage() {
  return (
    <div className="font-giest flex flex-1 flex-col pb-8">
      <ShopBanner />
      <div className="mt-8 flex flex-1 flex-col space-y-20">
        <ShopGallery />
        <ShopItems />
        <CustomerLoveSection />
        <ShopLegitimacy />
      </div>
    </div>
  );
}
