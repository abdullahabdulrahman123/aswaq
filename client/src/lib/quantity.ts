/**
 * كميات وأسعار كارت الصنف — الكمية عدد صحيح دايمًا، بطلب العميل.
 * المبالغ كلها بالقرش زي باقي المشروع.
 */

/** خمس أرقام — أي كمية أكبر من كده غلطة كتابة */
export const MAX_QTY = 99_999;

/** الكيبورد العربي بيكتب ٠-٩ و«٫» — بتتقري زي 0-9 و«.» */
export const latinDigits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫،]/g, '.');

/** اللي المشتري بيكتبه في خانة الكمية: أرقام صحيحة بس، وخمسة على الأكتر */
export const qtyInput = (text: string) => latinDigits(text).replace(/\D/g, '').slice(0, 5);

/** اللي بيتكتب في خانة الإجمالي: أرقام وفاصلة عشرية واحدة */
export const moneyInput = (text: string) => {
  const clean = latinDigits(text).replace(/[^\d.]/g, '');
  const [whole, ...rest] = clean.split('.');
  return `${whole.slice(0, 9)}${rest.length ? `.${rest.join('').slice(0, 2)}` : ''}`;
};

/** جنيه (نص) → قرش. الفاضي والغلط = null */
export function toPiastres(text: string): number | null {
  const clean = moneyInput(text).trim();
  if (!clean || clean === '.') return null;
  const pounds = Number(clean);
  return Number.isFinite(pounds) && pounds >= 0 ? Math.round(pounds * 100) : null;
}

/** قرش → جنيه للكتابة في الخانة: ١٤٠٠٠ → "140" و١٢٥٠ → "12.50" */
export const toPounds = (piastres: number) => (piastres / 100).toFixed(2).replace(/\.00$/, '');

/** بين واحد و99,999 — والكسور بتتقطع */
export const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.trunc(n) || 1));

/** «صنف» و«صنفين» و«٣ أصناف» — عدد أصناف السلة تحت الأيقونة */
export function itemsLabel(count: number) {
  if (count === 1) return 'صنف';
  if (count === 2) return 'صنفين';
  return count <= 10 ? `${count} أصناف` : `${count} صنف`;
}
