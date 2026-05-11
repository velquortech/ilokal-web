export function calculateSalePercentage(original: number, sale?: number) {
  if (!sale || sale >= original) return 0;
  return Math.round(((original - sale) / original) * 100);
}
