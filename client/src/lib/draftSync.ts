import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSales, type SalesSession } from '../context/SalesContext';
import type { CartLine } from '../context/StoreCartContext';
import { putDraft, putLine, type DraftInput } from './aswaqApi';
import type { ReceivingMethod } from './itemUnits';
import { ApiError } from './waslaApi';

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

/**
 * المسودة زي ما السيرفر عايزها — الكميات، والأسعار هو اللي بيحسبها. غير في
 * «مبيعات»: السعر اللي البائع كتبه بيتبعت مع السطر.
 */
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
    lines: lines.map((l) => ({
      itemId: l.itemId,
      unitName: l.unitName,
      quantity: l.qty,
      ...(session && l.price !== undefined ? { price: l.price } : {}),
    })),
  };
}

/**
 * id المسودة على السيرفر لكل أوردر على الجهاز (me:<shopId> أو <saleId>:<shopId>) —
 * عشان الصنف يتبعت لوحده من غير الهيدر.
 */
const DRAFT_IDS_KEY = 'aswaq_draft_ids';

function draftIds(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DRAFT_IDS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberDraftId(ref: string, id: string | null) {
  const ids = draftIds();
  if (id) ids[ref] = id;
  else delete ids[ref];
  try {
    localStorage.setItem(DRAFT_IDS_KEY, JSON.stringify(ids));
  } catch {
    // الجهاز رافض — الصنف الجاي هيبعت المسودة كلها بدل الصنف لوحده
  }
}

/** مفتاح الأوردر — نفس ref بتاع المسودة على السيرفر */
export const draftRef = (shopId: string, session: SalesSession | null) => `${session?.id ?? 'me'}:${shopId}`;

const lineKey = (l: { itemId: string; unitName: string }) => `${l.itemId}|${l.unitName}`;

/** اللي السيرفر شايله من السطر: الكمية والسعر اللي البائع كتبه — لو أي واحد اتغيّر السطر بيتبعت */
type SyncedLine = DraftInput['lines'][number];
const lineState = (l: SyncedLine | undefined) => (l ? `${l.quantity}@${l.price ?? ''}` : '');

/** الهيدر من غير السطور — لو اتغيّر المسودة كلها بتتبعت عشان الأسعار تتحسب تاني */
const headerOf = ({ lines: _lines, ...header }: DraftInput) => JSON.stringify(header);

/**
 * كام ملّي ثانية من غير تغيير في الصنف قبل ما يتبعت: «تم» في نافذة الكمية
 * بيتحفظ على طول تقريباً، وضغطات (+) ورا بعض بتتبعت مرة واحدة لما يبطّل
 * يدوس — «ست البيت اللي طالبة ٢٠ إزازة بيبسي مش هنحفظ ٢٠ مرة».
 */
const LINE_DEBOUNCE_MS = 600;

/** مفتاح «المسودة كلها» في مواعيد الحفظ — جنب مفاتيح الأصناف */
const ALL = '*';

/**
 * صفحة المتجر بتحفظ السلة مسودة على السيرفر، صنف صنف، بطلب العميل: الأوردر
 * بيفضل موجود حتى لو المشتري ما كمّلش، والهلال يقدر يكلّمه. للي داخل بحسابه
 * بس — الزائر ملوش حساب، فسلته على جهازه وبس.
 *
 *   - أول صنف بيفتح المسودة (الهيدر والسطور)، والسيرفر بيرجّع رقمها.
 *   - بعد كده كل صنف اتغيّر بيتبعت لوحده على رقم المسودة — من غير الهيدر.
 *   - الهيدر لو اتغيّر (طريقة الاستلام، مشتري البيعة، النشاط اللي بيشتري بيه)
 *     المسودة كلها بتتبعت تاني عشان الأسعار تتحسب من جديد.
 *   - لو المسودة اتمسحت أو اتأكدت من مكان تاني، المسودة كلها بتتبعت من الأول.
 *
 * الطلبات بتمشي ورا بعض واحدة واحدة. ولو التطبيق راح في الخلفية (مكالمة
 * مثلاً) أو المشتري خرج من المتجر، اللي مستني بيتبعت على طول. لو الحفظ فشل
 * (النت مثلاً) السلة على الجهاز سليمة، والتغيير الجاي بيبعت المسودة كلها.
 */
export function useDraftSync(shopId: string | null, lines: CartLine[], method: ReceivingMethod) {
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const { session } = useSales();
  const enabled = Boolean(user && !user.demo && !sessionExpired && shopId);
  const input = shopId ? draftInput(shopId, lines, method, session, selectedBusiness?.accountId ?? null) : null;
  const ref = shopId ? draftRef(shopId, session) : '';

  /** آخر نسخة من السلة — الطلب اللي بيتنفّذ بعدين بياخد منها */
  const latest = useRef({ input, ref });
  latest.current = { input, ref };

  /**
   * اللي السيرفر شايله: الهيدر وكمية كل صنف. null = مش عارفين (أول مرة، أو
   * طلب فشل) — ساعتها المسودة كلها بتتبعت.
   */
  const synced = useRef<{ ref: string; header: string; lines: Map<string, string> } | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const run = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch(() => {
      // التغيير الجاي بيبعت المسودة كلها ويطابقها
      synced.current = null;
    });
  }, []);

  /** المسودة كلها — بتفتحها، أو بتعيد تسعيرها، أو بتطابقها مع الجهاز */
  const saveAll = useCallback(async () => {
    const { input: now, ref: nowRef } = latest.current;
    if (!now) return;
    const order = await withToken((token) => putDraft(token, now));
    rememberDraftId(nowRef, order?.id ?? null);
    synced.current = { ref: nowRef, header: headerOf(now), lines: new Map(now.lines.map((l) => [lineKey(l), lineState(l)])) };
  }, [withToken]);

  /** صنف واحد على رقم المسودة. من غير رقم، أو لو المسودة راحت: المسودة كلها */
  const saveLine = useCallback(
    async (key: string) => {
      const { input: now, ref: nowRef } = latest.current;
      const state = synced.current;
      const orderId = draftIds()[nowRef];
      if (!now || !state || state.ref !== nowRef || state.header !== headerOf(now) || !orderId) return saveAll();
      const line = now.lines.find((l) => lineKey(l) === key);
      if ((state.lines.get(key) ?? '') === lineState(line)) return;
      const [itemId, unitName] = key.split('|');
      try {
        const order = await withToken((token) => putLine(token, orderId, { itemId, unitName, quantity: line?.quantity ?? 0, price: line?.price }));
        if (order === null) rememberDraftId(nowRef, null);
        if (line) state.lines.set(key, lineState(line));
        else state.lines.delete(key);
      } catch (err) {
        if (!(err instanceof ApiError && (err.status === 404 || err.status === 409))) throw err;
        rememberDraftId(nowRef, null);
        synced.current = null;
        await saveAll();
      }
    },
    [saveAll, withToken],
  );

  const fire = useCallback(
    (key: string) => {
      timers.current.delete(key);
      run(() => (key === ALL ? saveAll() : saveLine(key)));
    },
    [run, saveAll, saveLine],
  );

  const schedule = useCallback(
    (key: string) => {
      clearTimeout(timers.current.get(key));
      timers.current.set(key, setTimeout(() => fire(key), LINE_DEBOUNCE_MS));
    },
    [fire],
  );

  /** كل اللي مستني يتبعت على طول */
  const flush = useCallback(() => {
    for (const [key, timer] of [...timers.current]) {
      clearTimeout(timer);
      fire(key);
    }
  }, [fire]);

  useEffect(() => {
    if (!shopId || session) return;
    try {
      localStorage.setItem(methodKey(shopId), method);
    } catch {
      // الجهاز رافض — الفاتورة هتفترض استلام
    }
  }, [shopId, method, session]);

  const signature = JSON.stringify(input);
  useEffect(() => {
    if (!enabled || !input) return;
    const state = synced.current;
    if (!state || state.ref !== ref || state.header !== headerOf(input)) {
      // مش عارفين السيرفر شايل إيه، والسلة فاضية: مبتتبعتش — كانت هتمسح
      // مسودة اتعملت من جهاز تاني قبل ما المشتري يرجّعها من «الطلبات»
      if (input.lines.length === 0 && !draftIds()[ref]) return;
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
      schedule(ALL);
      return;
    }
    if (timers.current.has(ALL)) return schedule(ALL);
    const keys = new Set([...state.lines.keys(), ...input.lines.map(lineKey)]);
    for (const key of keys) {
      if ((state.lines.get(key) ?? '') !== lineState(input.lines.find((l) => lineKey(l) === key))) schedule(key);
    }
    // signature بدل input: الكائن بيتعمل جديد مع كل رسمة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref, signature, schedule]);

  // مكالمة بتقفل التطبيق، أو الخروج من المتجر: اللي مستني يتبعت على طول
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);
}
