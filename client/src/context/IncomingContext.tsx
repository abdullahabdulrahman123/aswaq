import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { aswaqApiConfigured, aswaqApiOrigin, fetchIncoming, type Order } from '../lib/aswaqApi';
import { isOpenState } from '../lib/orderFlow';
import { useAuth } from './AuthContext';

/**
 * «الطلبات الواردة» بطلب العميل (٢٧ سبتمبر): الأوردرات المؤكدة اللي النشاط
 * المختار بائعها، لحظة بلحظة بالـsocket.io.
 *
 *   - العداد الأحمر (زي بتاع السلة) = الطلبات اللي وصلت من آخر مرة الصفحة
 *     اتفتحت. آخر مرة دي محفوظة على الجهاز لكل نشاط، فالعداد بيفضل صح بعد
 *     قفل التطبيق وفتحه.
 *   - طلب جديد والمستخدم في صفحة تانية: تنبيه صغير (toast). وهو على صفحة
 *     الطلبات الواردة نفسها: مفيش تنبيه — الطلب بيظهر في الليستة، زي العميل
 *     ما قال «لو فاتح التطبيق الإشعار ما يجيلكش».
 *   - الطلب اللي المستخدم أكّده بنفسه (بيعة «مبيعات») بيتعد من غير تنبيه.
 */

interface Incoming {
  /** null = لسه بنجيب، أو مفيش نشاط مختار */
  orders: Order[] | null;
  /** الجديد من آخر زيارة للصفحة */
  unseen: number;
  /** الصفحة اتفتحت — العداد يتصفّر */
  markSeen: () => void;
  /** آخر طلب وصل لحظياً ومحدش شافه لسه — التنبيه */
  toast: Order | null;
  dismissToast: () => void;
  /** الـsocket شغال ومتابع النشاط */
  live: boolean;
}

const Ctx = createContext<Incoming | null>(null);

const seenKey = (accountId: string) => `aswaq_incoming_seen_${accountId}`;
const readSeen = (accountId: string) => {
  try {
    return Number(localStorage.getItem(seenKey(accountId)) ?? 0) || 0;
  } catch {
    return 0;
  }
};
const confirmedAt = (o: Order) => Date.parse(o.checkedOutAt ?? o.updatedAt);

/** «مهامي» فيها الطلبات الواردة (مكالمة ٣٠ سبتمبر) — التنبيه مبيطلعش وهو عليها */
const onIncomingPage = (pathname: string) => pathname === '/tasks';

export function IncomingProvider({ children }: { children: ReactNode }) {
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const { pathname } = useLocation();
  const accountId = user && !user.demo && !sessionExpired && aswaqApiConfigured ? (selectedBusiness?.accountId ?? null) : null;

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [seenAt, setSeenAt] = useState(0);
  const [toast, setToast] = useState<Order | null>(null);
  const [live, setLive] = useState(false);
  const here = useRef(pathname);
  here.current = pathname;

  // الليستة من السيرفر مع كل نشاط — والعداد من آخر زيارة محفوظة
  useEffect(() => {
    setOrders(null);
    setToast(null);
    if (!accountId) return;
    setSeenAt(readSeen(accountId));
    let cancelled = false;
    withToken((token) => fetchIncoming(token, accountId))
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, withToken]);

  // لحظة بلحظة: الـsocket بيتابع النشاط المختار بس
  useEffect(() => {
    setLive(false);
    if (!accountId) return;
    // التوكن بيتجاب مع كل اتصال (وإعادة اتصال) — بيتجدّد لو خلص
    const socket: Socket = io(aswaqApiOrigin, {
      auth: (cb) => {
        withToken(async (token) => token)
          .then((token) => cb({ token }))
          .catch(() => cb({}));
      },
      transports: ['websocket', 'polling'],
    });
    const watch = () => socket.emit('watch', accountId, (res: { ok: boolean }) => setLive(Boolean(res?.ok)));
    socket.on('connect', watch);
    socket.on('disconnect', () => setLive(false));
    socket.on('order:new', ({ order, own }: { order: Order; own: boolean }) => {
      if (order.from.acc !== accountId) return;
      setOrders((prev) => [order, ...(prev ?? []).filter((o) => o.id !== order.id)]);
      if (!own && !onIncomingPage(here.current)) setToast(order);
    });
    // اتنقل مرحلة («إتمام» من أي جهاز) أو الفاتورة اتعدّلت: المكتمل بيخرج من «مهامي»
    socket.on('order:state', ({ order }: { order: Order }) => {
      if (order.from.acc !== accountId) return;
      setOrders((prev) => (prev ? (isOpenState(order.state) ? prev.map((o) => (o.id === order.id ? order : o)) : prev.filter((o) => o.id !== order.id)) : prev));
    });
    return () => {
      socket.disconnect();
    };
  }, [accountId, withToken]);

  const markSeen = useCallback(() => {
    if (!accountId) return;
    const now = Date.now();
    setSeenAt(now);
    setToast(null);
    try {
      localStorage.setItem(seenKey(accountId), String(now));
    } catch {
      // الجهاز رافض — العداد هيرجع بعد إعادة التحميل بس
    }
  }, [accountId]);

  const value = useMemo<Incoming>(
    () => ({
      orders: accountId ? orders : null,
      unseen: accountId ? (orders ?? []).filter((o) => confirmedAt(o) > seenAt).length : 0,
      markSeen,
      toast: accountId ? toast : null,
      dismissToast: () => setToast(null),
      live,
    }),
    [accountId, orders, seenAt, markSeen, toast, live],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIncoming(): Incoming {
  const value = useContext(Ctx);
  if (!value) throw new Error('useIncoming must be used within IncomingProvider');
  return value;
}
