/**
 * ⚠️ منطق التسعير — مؤقتاً على المتصفح.
 *
 * كل الحسابات هنا لازم تنتقل للسيرفر لما نبنيه، والواجهة تبقى بتعرض بس.
 * السبب: نوع المشتري (تجزئة/جملة) محفوظ حالياً على جهاز الزبون، يعني أي حد
 * يقدر يغيّره وياخد أسعار الجملة. مش مشكلة دلوقتي لأن مفيش بيع حقيقي،
 * لكن ساعة إنشاء الطلب لازم السيرفر يعيد حساب كل سعر من الحساب المعتمد
 * ويرفض أي سعر جاي من العميل.
 *
 * حطّيت المنطق كله في الملف ده عشان ينتقل قطعة واحدة من غير ما نلف على الصفحات.
 * كل المبالغ بالقروش (integer).
 */

import type { Offer } from '../data/catalog';

export type BuyerType = 'retail' | 'wholesale';

/** سعر الوحدة حسب نوع المشتري والكمية — شرائح الجملة تُطبّق تصاعدياً */
export function unitPrice(offer: Offer, qty: number, buyerType: BuyerType): number {
  if (buyerType === 'retail') return offer.price;
  const tier = [...offer.tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .filter((t) => qty >= t.minQty)
    .pop();
  return tier ? tier.price : offer.price;
}

/** الشريحة الجاية — نعرضها كحافز "زوّد كذا توفّر كذا" */
export function nextTier(offer: Offer, qty: number) {
  return [...offer.tiers].sort((a, b) => a.minQty - b.minQty).find((t) => qty < t.minQty);
}

/** السعر المعروض على الكرت: في الجملة نعرض سعر أول شريحة لأنه اللي التاجر هيدفعه فعلاً */
export function displayPrice(offer: Offer, buyerType: BuyerType): number {
  if (buyerType === 'retail') return offer.price;
  const first = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  return first ? first.price : offer.price;
}

/** أقل كمية منطقية للإضافة — في الجملة نبدأ من أول شريحة */
export function startingQty(offer: Offer, buyerType: BuyerType): number {
  if (buyerType === 'retail') return 1;
  const first = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  return first ? first.minQty : 1;
}
