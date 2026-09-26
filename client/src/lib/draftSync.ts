import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSales, type SalesSession } from '../context/SalesContext';
import type { CartLine } from '../context/StoreCartContext';
import { putDraft, type DraftInput } from './aswaqApi';
import type { ReceivingMethod } from './itemUnits';

/** كام ملّي ثانية من غير تغيير قبل ما المسودة تتبعت — عشان كل (+) مبقاش طلب */
const DEBOUNCE_MS = 700;

/**
 * طريقة الاستلام اللي المشتري اختارها في متجر (لنفسه) — الفاتورة بتحتاجها عشان
 * تحفظ المسودة بنفس الأسعار. في البيعة بتتاخد من البيعة نفسها.
 */
const methodKey = (shopId: string) => `aswaq_method_${shopId}`;

export function rememberedMethod(shopId: string): ReceivingMethod {
  try {
    return localStorage.getItem(methodKey(shopId)) === 'delivery' ? 'delivery' : 'pickup';
  } catch {
    return 'pickup';
  }
}

/** المسودة زي ما السيرفر عايزها — الكميات بس، والأسعار هو اللي بيحسبها */
export function draftInput(
  shopId: string,
  lines: CartLine[],
  method: ReceivingMethod,
  session: SalesSession | null,
  businessAccountId: string | null,
): DraftInput {
  return {
    shopId,
    method: session?.method ?? method,
    to: session ? undefined : (businessAccountId ?? undefined),
    sale: session ?? undefined,
    lines: lines.map((l) => ({ itemId: l.itemId, unitName: l.unitName, quantity: l.qty })),
  };
}

/**
 * صفحة المتجر بتحفظ السلة مسودة على السيرفر مع كل تغيير، بطلب العميل: الأوردر
 * بيفضل موجود حتى لو المشتري ما كمّلش، والهلال يقدر يكلّمه. للي داخل بحسابه
 * بس — الزائر ملوش حساب، فسلته على جهازه وبس. لو الحفظ فشل (النت مثلاً) السلة
 * على الجهاز سليمة، والتغيير الجاي بيبعتها كلها تاني.
 */
export function useDraftSync(shopId: string | null, lines: CartLine[], method: ReceivingMethod) {
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const { session } = useSales();
  const enabled = Boolean(user && !user.demo && !sessionExpired && shopId);
  const input = shopId ? draftInput(shopId, lines, method, session, selectedBusiness?.accountId ?? null) : null;
  const signature = JSON.stringify(input);

  useEffect(() => {
    if (!shopId || session) return;
    try {
      localStorage.setItem(methodKey(shopId), method);
    } catch {
      // الجهاز رافض — الفاتورة هتفترض استلام
    }
  }, [shopId, method, session]);

  useEffect(() => {
    if (!enabled || !input) return;
    const timer = setTimeout(() => {
      withToken((token) => putDraft(token, input)).catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // signature بدل input: الكائن بيتعمل جديد مع كل رسمة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature, withToken]);
}
