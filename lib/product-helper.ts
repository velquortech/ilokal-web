export function calculatePercentage(original: number, sale: number) {
  const discount = ((original - sale) / original) * 100;
  return Math.round(discount);
}
