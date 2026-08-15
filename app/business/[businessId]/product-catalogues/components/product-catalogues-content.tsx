'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/custom/PageHeader';
import { PackageOpen, Plus } from 'lucide-react';
import { Catalogues } from './catalogues';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterProducts } from './filter-products';
import { ProductTable } from './product-table/products-table';
import { AddProductDialog } from './add-product';
import { ProductStats } from './product-stats';
import { ManageSections } from './manage-sections';
import { Card, CardContent } from '@/components/ui/card';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import {
  CATALOGUE_ADD_PARAM,
  cataloguePathWithoutAdd,
} from '@/config/routeConfig';
import type {
  ProductResponse,
  Category,
  ProductSectionWithCount,
  ProductStats as ProductStatsType,
} from '@/lib/types';

interface ProductCataloguesContentProps {
  products: ProductResponse[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  categories: Category[];
  stats: ProductStatsType;
  businessId: string;
  /** The shop's OWN groupings — not the platform taxonomy in `categories`. */
  sections: ProductSectionWithCount[];
  uncategorisedCount: number;
  sectionsFailed?: boolean;
  /** Counts RPC failed — every `product_count` is a placeholder zero. */
  countsFailed?: boolean;
}

export function ProductCataloguesContent({
  products,
  metadata,
  categories,
  stats,
  businessId,
  sections,
  uncategorisedCount,
  sectionsFailed = false,
  countsFailed = false,
}: ProductCataloguesContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vocabulary = useOfferingVocabulary();

  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );

  React.useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '');
  }, [searchParams]);

  /**
   * `?add=1` — arrive with the add dialog already open.
   *
   * Seeded from the marker rather than opened by an effect, so the dialog is
   * present on the first client render instead of appearing a frame later.
   * The marker is then consumed exactly once and stripped, so a refresh or a
   * shared link cannot replay it.
   *
   * Ref-guarded, not dep-guarded: `useRouter()`'s identity is not something to
   * bet a repeated `replace` on — the same reason the welcome marker is.
   */
  const [addOpen, setAddOpen] = React.useState(
    () => searchParams.get(CATALOGUE_ADD_PARAM) === '1',
  );
  const addMarkerConsumed = React.useRef(false);

  React.useEffect(() => {
    if (addMarkerConsumed.current) return;
    if (searchParams.get(CATALOGUE_ADD_PARAM) !== '1') return;
    addMarkerConsumed.current = true;
    setAddOpen(true);
    router.replace(cataloguePathWithoutAdd(businessId, searchParams));
  }, [businessId, router, searchParams]);

  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Debounce search input → URL update
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleSectionChange = React.useCallback(
    (sectionId: string) => {
      updateParams({ section: sectionId || null, page: '1' });
    },
    [updateParams],
  );

  const handleStatusChange = React.useCallback(
    (status: string) => {
      updateParams({ status: status || null, page: '1' });
    },
    [updateParams],
  );

  const handlePaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      updateParams({
        page: page === 1 ? null : String(page),
        perPage: pageSize === 10 ? null : String(pageSize),
      });
    },
    [updateParams],
  );

  const selectedSection = searchParams.get('section') ?? '';
  const selectedStatus = searchParams.get('status') ?? '';

  return (
    <div className="font-giest flex h-max min-w-0 flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title={vocabulary.catalogue}
        lede={`Manage your ${vocabulary.plural.toLowerCase()}`}
        action={
          <>
            <AddProductDialog
              categories={categories}
              sections={sections}
              onSuccess={() => router.refresh()}
              open={addOpen}
              onOpenChange={setAddOpen}
            >
              <Button>
                <Plus />
                {vocabulary.addLabel}
              </Button>
            </AddProductDialog>
          </>
        }
      />

      <ProductStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          {/* Mobile-first toolbar: search is the primary control, so it leads
              the card on a phone (full width, own line) while the section
              strip and the action buttons share the row below. On `sm+`
              everything returns to one row — strip flexes, actions and search
              sit at the end. Same `order-first` pattern as Redemptions (§6.8). */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="order-2 min-w-0 flex-1 sm:order-none">
              <Catalogues
                sections={sections}
                uncategorisedCount={uncategorisedCount}
                countsFailed={countsFailed}
                selectedSection={selectedSection}
                onSectionChange={handleSectionChange}
              />
            </div>
            <div className="order-3 flex flex-wrap items-center gap-2 sm:order-none">
              {/* Sections are the owner's own grouping. The platform
                  taxonomy in `categories` stays admin-curated — see
                  .claude/CATALOGUES.md for why they are two tables. */}
              <ManageSections
                businessId={businessId}
                sections={sections}
                uncategorisedCount={uncategorisedCount}
                loadFailed={sectionsFailed}
                countsFailed={countsFailed}
              />
              <FilterProducts
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
              />
            </div>
            <div className="order-first w-full sm:order-none sm:w-auto">
              <SearchBar
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <ProductTable
            products={products}
            sections={sections}
            page={metadata.page}
            pageSize={metadata.per_page}
            totalPages={metadata.total_pages}
            total={metadata.total}
            onPaginationChange={handlePaginationChange}
            emptyState={
              /* §6.6: an empty table is a product surface, not a "No
                  results." row — say why it is empty and what to do. */
              <div className="flex flex-col items-center gap-1.5 px-4 py-10">
                <PackageOpen className="text-muted-foreground size-8" />
                <p className="font-medium">
                  {metadata.total === 0
                    ? `No ${vocabulary.plural.toLowerCase()} yet`
                    : 'No matches found'}
                </p>
                <p className="text-muted-foreground text-sm">
                  {metadata.total === 0
                    ? `Add your first ${vocabulary.singular.toLowerCase()} and it will appear here.`
                    : 'Try adjusting your search or filters.'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
