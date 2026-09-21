/**
 * صفحات النشاط بتعرف هي بتاعت أنهي نشاط من اللينك (/business/:id/...)، مش من
 * الحساب المختار فوق. لما المستخدم يغيّر الحساب من المنيو الصفحة بتمشي معاه —
 * نفس القسم للنشاط الجديد، والحساب الشخصي (معندوش صفحات نشاط) بيروح للرئيسية.
 * بطلب العميل.
 *
 *   /business/:id                   بيانات الشركة
 *   /business/:id/items             الأصناف
 *   /business/:id/items/new         إضافة صنف
 *   /business/:id/items/:item/edit  تعديل صنف
 *   /business/:id/store-items       إدارة أصناف المتاجر
 */
const BUSINESS_PATH = /^\/business\/([^/]+)(\/store-items|\/items(?:\/(new|[^/]+\/edit))?)?\/?$/;

/** النشاط اللي الصفحة دي بتاعته — null لو مش صفحة نشاط */
export function businessInPath(pathname: string): string | null {
  const match = BUSINESS_PATH.exec(pathname);
  // «/business/new» صفحة إنشاء نشاط، مش صفحة نشاط بعينه
  if (!match || match[1] === 'new') return null;
  return decodeURIComponent(match[1]);
}

/**
 * الصفحة اللي نروحلها لما الحساب يتغيّر لـ accountId (null = الحساب الشخصي).
 * null = خليك مكانك: الصفحة مش صفحة نشاط، أو هي أصلاً بتاعت النشاط ده.
 */
export function pathAfterSwitch(pathname: string, accountId: string | null): string | null {
  const current = businessInPath(pathname);
  if (current === null || current === accountId) return null;
  if (accountId === null) return '/';

  const [, , section, itemPage] = BUSINESS_PATH.exec(pathname)!;
  const base = `/business/${encodeURIComponent(accountId)}`;
  if (!section) return base;
  // أصناف المتاجر: نفس الصفحة للنشاط الجديد — بتختار أول متجر من مقراته هو
  if (section === '/store-items') return `${base}/store-items`;
  // إضافة صنف: فورم فاضي للنشاط الجديد. تعديل صنف: الصنف بتاع النشاط القديم، فنروح لأصناف الجديد
  return itemPage === 'new' ? `${base}/items/new` : `${base}/items`;
}
