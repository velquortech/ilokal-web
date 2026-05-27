import { redirect } from 'next/navigation';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  getProductsByBusinessId,
  getProductStatsByBusinessId,
  getCategoriesPaginated,
} from '@/lib/api/products/productQuery';
import { ProductCataloguesClient } from './components/ProductCataloguesClient';
import type { ProductResponse } from '@/lib/types';

export default async function ProductCataloguesPage() {
  const verify = await verifyBusinessOwner();

  if (!verify.authorized) {
    const isUnauthenticated =
      verify.error &&
      typeof verify.error === 'object' &&
      'code' in verify.error &&
      (verify.error as { code: string }).code === 'AUTHENTICATION_ERROR';

    if (isUnauthenticated) redirect('/login');
  }

  const businessId = verify.business?.id;

  const [productsResult, stats, categoriesResult] = await Promise.all([
    businessId
      ? getProductsByBusinessId(businessId)
      : Promise.resolve({ products: [] }),
    businessId
      ? getProductStatsByBusinessId(businessId)
      : Promise.resolve({
          total: 0,
          active: 0,
          unlisted: 0,
          disabled: 0,
          on_sale: 0,
        }),
    getCategoriesPaginated({ page: 1, per_page: 100 }),
  ]);

  const products =
    'error' in productsResult || !('products' in productsResult)
      ? ([] as ProductResponse[])
      : (productsResult.products as unknown as ProductResponse[]);

  const categories = categoriesResult.categories;

  return (
    <ProductCataloguesClient
      initialProducts={products}
      stats={stats}
      categories={categories}
    />
  );
}
