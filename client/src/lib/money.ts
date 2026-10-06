/** مبلغ بالقرش زي ما بيتكتب: «1,250 ج.م»، والقروش بس لو فيه كسر («12.50 ج.م») */
export const egp = (piastres: number) => {
  const value = piastres / 100;
  const hasFraction = piastres % 100 !== 0;
  return `${value.toLocaleString('en-EG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} ج.م`;
};
