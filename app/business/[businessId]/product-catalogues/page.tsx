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
  if (!verify.authorized) redirect('/login');

  const [productsResult, stats, categoriesResult] = await Promise.all([
    getProductsByBusinessId(verify.business!.id),
    getProductStatsByBusinessId(verify.business!.id),
    getCategoriesPaginated({ page: 1, per_page: 100 }),
  ]);

  const products =
    'error' in productsResult
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
