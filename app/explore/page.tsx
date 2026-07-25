import type { Metadata } from 'next';
import {
  getBusinessDirectory,
  getCustomerCategories,
} from '@/lib/api/customer/customerQuery';
import { ExploreContent } from './components/explore-content';

export const metadata: Metadata = {
  title: 'Explore Local Shops - iLokal',
  description:
    'Discover verified local businesses, deals, and coupons around Iloilo City.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );
  const perPage = Math.min(
    24,
    Math.max(
      6,
      parseInt(typeof sp.perPage === 'string' ? sp.perPage : '12', 10) || 12,
    ),
  );
  const search = typeof sp.search === 'string' ? sp.search : undefined;
  const categoryId = typeof sp.category === 'string' ? sp.category : undefined;

  const [directory, categories] = await Promise.all([
    getBusinessDirectory({
      page,
      per_page: perPage,
      search,
      category_id: categoryId,
    }),
    getCustomerCategories(),
  ]);

  const { businesses, metadata } =
    'error' in directory
      ? {
          businesses: [],
          metadata: { total: 0, page: 1, per_page: perPage, total_pages: 0 },
        }
      : directory;

  return (
    <ExploreContent
      businesses={businesses}
      metadata={metadata}
      categories={categories}
    />
  );
}
