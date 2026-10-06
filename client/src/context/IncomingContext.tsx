import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { aswaqApiConfigured, aswaqApiOrigin, fetchIncoming, type Order } from '../lib/aswaqApi';
import { byDueTime } from '../lib/delivery';
import { isOpenState } from '../lib/orderFlow';
import { useAuth } from './AuthContext';

/**
 * «الطلبات الواردة» بطلب العميل (٢٧ سبتمبر): الأوردرات المؤكدة اللي النشاط
 * المختار بائعها، لحظة بلحظة بالـsocket.io.
 *
 *   - العداد الأحمر على «مهامي» = كل الفواتير اللي لسه متنفذتش (مؤكدة ولسه
 *     متمتش ولا اتلغت). مكالمة ٥ أكتوبر: «إشعار مهامي يفضل موجود» — كان بيعد
 *     الجديد من آخر زيارة وبيتصفّر لما الصفحة تتفتح، دلوقتي بيقل بس لما فاتورة
 *     تخلص أو تتلغي.
 *   - طلب جديد والمستخدم في صفحة تانية: تنبيه صغير (toast). وهو على صفحة
 *     الطلبات الواردة نفسها: مفيش تنبيه — الطلب بيظهر في الليستة، زي العميل
 *     ما قال «لو فاتح التطبيق الإشعار ما يجيلكش».
 *   - الطلب اللي المستخدم أكّده بنفسه (بيعة «مبيعات») بيتعد من غير تنبيه.
 *   - الترتيب (رسالة العميل ٦ أكتوبر): بيوم التسليم وبعدين الساعة، الأقرب فوق —
 *     كان الأحدث تأكيداً فوق. الطلب اللي بيوصل أو ميعاده بيتعدّل بياخد مكانه.
 */

interface Incoming {
  /** بميعاد التسليم، الأقرب الأول. null = لسه بنجيب، أو مفيش نشاط مختار */
  orders: Order[] | null;
  /** الفواتير اللي لسه متنفذتش — العداد على «مهامي» */
  pending: number;
  /** الصفحة اتفتحت — التنبيه يختفي (العداد لأ) */
  markSeen: () => void;
  /** آخر طلب وصل لحظياً ومحدش شافه لسه — التنبيه */
  toast: Order | null;
  dismissToast: () => void;
  /** الـsocket شغال ومتابع النشاط */
  live: boolean;
}

const Ctx = createContext<Incoming | null>(null);

/** «مهامي» فيها الطلبات الواردة (مكالمة ٣٠ سبتمبر) — التنبيه مبيطلعش وهو عليها */
const onIncomingPage = (pathname: string) => pathname === '/tasks';

export function IncomingProvider({ children }: { children: ReactNode }) {
  const { user, sessionExpired, selectedBusiness, withToken } = useAuth();
  const { pathname } = useLocation();
  const accountId = user && !user.demo && !sessionExpired && aswaqApiConfigured ? (selectedBusiness?.accountId ?? null) : null;

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [toast, setToast] = useState<Order | null>(null);
  const [live, setLive] = useState(false);
  const here = useRef(pathname);
  here.current = pathname;

  // الليستة من السيرفر مع كل نشاط
  useEffect(() => {
    setOrders(null);
    setToast(null);
    if (!accountId) return;
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
    // اتنقل مرحلة («إتمام» من أي جهاز) أو اتلغى أو الفاتورة اتعدّلت: المكتمل والملغي بيخرجوا من «مهامي»
    socket.on('order:state', ({ order }: { order: Order }) => {
      if (order.from.acc !== accountId) return;
      setOrders((prev) => (prev ? (isOpenState(order.state) ? prev.map((o) => (o.id === order.id ? order : o)) : prev.filter((o) => o.id !== order.id)) : prev));
    });
    return () => {
      socket.disconnect();
    };
  }, [accountId, withToken]);

  const markSeen = useCallback(() => setToast(null), []);
  const sorted = useMemo(() => (orders ? [...orders].sort(byDueTime) : null), [orders]);

  const value = useMemo<Incoming>(
    () => ({
      orders: accountId ? sorted : null,
      pending: accountId ? (orders ?? []).filter((o) => isOpenState(o.state)).length : 0,
      markSeen,
      toast: accountId ? toast : null,
      dismissToast: () => setToast(null),
      live,
    }),
    [accountId, orders, sorted, markSeen, toast, live],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIncoming(): Incoming {
  const value = useContext(Ctx);
  if (!value) throw new Error('useIncoming must be used within IncomingProvider');
  return value;
}
