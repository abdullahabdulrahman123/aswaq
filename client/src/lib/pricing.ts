/**
 * ⚠️ منطق التسعير — مؤقتاً على المتصفح.
 *
 * كل الحسابات هنا لازم تنتقل للسيرفر لما نبنيه، والواجهة تبقى بتعرض بس.
 * ساعة إنشاء الطلب لازم السيرفر يعيد حساب كل سعر من الحساب المعتمد
 * ويرفض أي سعر جاي من العميل.
 *
 * كل المبالغ بالقروش (integer).
 */

import type { Offer } from '../data/catalog';

/**
 * نوع الحساب هو اللي بيحدد الأسعار — مفيش مفتاح يدوي.
 * بييجي من وصلة في الـid_token (claim اسمه account_type).
 * الزائر بيتعامل معاملة الفرد.
 */
export type AccountType = 'INDIVIDUAL' | 'COMPANY';

/** الشركات بس هي اللي بتشوف أسعار الكميات */
export const seesTierPricing = (accountType: AccountType) => accountType === 'COMPANY';

/** سعر الوحدة حسب نوع الحساب والكمية — الشرائح تُطبّق تصاعدياً */
export function unitPrice(offer: Offer, qty: number, accountType: AccountType): number {
  if (!seesTierPricing(accountType)) return offer.price;
  const tier = [...offer.tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .filter((t) => qty >= t.minQty)
    .pop();
  return tier ? tier.price : offer.price;
}

/** الشريحة الجاية — حافز "زوّد كذا توفّر كذا" */
export function nextTier(offer: Offer, qty: number) {
  return [...offer.tiers].sort((a, b) => a.minQty - b.minQty).find((t) => qty < t.minQty);
}

/** السعر المعروض على الكرت: للشركات نعرض سعر أول شريحة لأنه اللي هتدفعه فعلاً */
export function displayPrice(offer: Offer, accountType: AccountType): number {
  if (!seesTierPricing(accountType)) return offer.price;
  const first = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  return first ? first.price : offer.price;
}

/** أقل كمية منطقية للإضافة — الشركات تبدأ من أول شريحة */
export function startingQty(offer: Offer, accountType: AccountType): number {
  if (!seesTierPricing(accountType)) return 1;
  const first = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  return first ? first.minQty : 1;
}
