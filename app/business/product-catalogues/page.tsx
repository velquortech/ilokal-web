import {
  getCategoriesAction,
  getBusinessProductsAction,
} from '../actions/productActions';
import { ProductCataloguesContent } from './components/product-catalogues-content';
import type { ProductResponse } from '@/lib/types';

export default async function ProductCataloguesPage() {
  const [productsResult, categoriesResult] = await Promise.all([
    getBusinessProductsAction(),
    getCategoriesAction(),
  ]);

  const products = (
    productsResult.success ? (productsResult.data ?? []) : []
  ) as ProductResponse[];

  const categories = categoriesResult.success
    ? (categoriesResult.data ?? [])
    : [];

  return (
    <ProductCataloguesContent
      initialProducts={products}
      categories={categories}
    />
  );
}
