export function calculatePercentage(original: number, sale: number) {
  const discount = ((original - sale) / original) * 100;
  return Math.round(discount);
}

type WithSaleFields = {
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

/**
 * Returns true if the product has an active sale right now.
 * Accounts for optional start/end window.
 */
export function isProductSaleActive(product: WithSaleFields): boolean {
  if (product.sale_price === null) return false;
  const now = new Date();
  if (product.sale_starts_at && new Date(product.sale_starts_at) > now)
    return false;
  if (product.sale_ends_at && new Date(product.sale_ends_at) < now)
    return false;
  return true;
}

/**
 * Clears sale fields when the sale window has expired or not yet started.
 * Applied in the query layer so every caller gets clean data regardless
 * of whether the cron cleanup has run yet.
 */
export function normalizeProductSale<T extends WithSaleFields>(product: T): T {
  if (isProductSaleActive(product)) return product;
  return {
    ...product,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
  };
}
