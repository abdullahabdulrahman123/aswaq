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
 *   - رسالة العميل ٩ أكتوبر: «مهامي» كلها لحظية — مسودات «مبيعات» كمان (subscribe)،
 *     والـsocket لما يرجع بعد ما فصل (الموبايل نام أو النت قطع) الليستة بتتجاب تاني
 *     (resync) عشان اللي فات وهو فاصل ميضيعش.
 */

/** اللي بيوصل لحظياً لـ«مهامي»: مسودة «مبيعات» اتعملت أو اتعدّلت، أو اتمسحت، أو أوردر اتأكد أو اتنقل */
export type OrderEvent =
  | { type: 'draft'; order: Order }
  | { type: 'draft-gone'; id: string; ref: string }
  | { type: 'order'; order: Order };

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
  /** يسمع أحداث النشاط المختار لحظياً — بيرجّع اللي يوقّفه */
  subscribe: (listener: (event: OrderEvent) => void) => () => void;
  /** بيزيد كل ما الـsocket يرجع بعد ما فصل — الليستات بتتجاب تاني */
  resync: number;
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
  const [resync, setResync] = useState(0);
  const listeners = useRef(new Set<(event: OrderEvent) => void>());
  const here = useRef(pathname);
  here.current = pathname;

  useEffect(() => {
    setOrders(null);
    setToast(null);
  }, [accountId]);

  // الليستة من السيرفر مع كل نشاط، وتاني لما الـsocket يرجع
  useEffect(() => {
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
  }, [accountId, withToken, resync]);

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
    const tell = (event: OrderEvent) => listeners.current.forEach((listener) => listener(event));
    let connected = false;
    socket.on('connect', () => {
      watch();
      if (connected) setResync((n) => n + 1);
      connected = true;
    });
    socket.on('disconnect', () => setLive(false));
    socket.on('order:new', ({ order, own }: { order: Order; own: boolean }) => {
      if (order.from.acc !== accountId) return;
      setOrders((prev) => [order, ...(prev ?? []).filter((o) => o.id !== order.id)]);
      if (!own && !onIncomingPage(here.current)) setToast(order);
      tell({ type: 'order', order });
    });
    // اتنقل مرحلة («إتمام» من أي جهاز) أو اتلغى أو الفاتورة اتعدّلت: المكتمل والملغي بيخرجوا من «مهامي»
    socket.on('order:state', ({ order }: { order: Order }) => {
      if (order.from.acc !== accountId) return;
      setOrders((prev) => (prev ? (isOpenState(order.state) ? prev.map((o) => (o.id === order.id ? order : o)) : prev.filter((o) => o.id !== order.id)) : prev));
      tell({ type: 'order', order });
    });
    socket.on('order:draft', ({ order, gone }: { order?: Order; gone?: { id: string; ref: string; acc: string } }) => {
      if (order && order.from.acc === accountId) tell({ type: 'draft', order });
      if (gone && gone.acc === accountId) tell({ type: 'draft-gone', id: gone.id, ref: gone.ref });
    });
    return () => {
      socket.disconnect();
    };
  }, [accountId, withToken]);

  const markSeen = useCallback(() => setToast(null), []);
  const subscribe = useCallback((listener: (event: OrderEvent) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const sorted = useMemo(() => (orders ? [...orders].sort(byDueTime) : null), [orders]);

  const value = useMemo<Incoming>(
    () => ({
      orders: accountId ? sorted : null,
      pending: accountId ? (orders ?? []).filter((o) => isOpenState(o.state)).length : 0,
      markSeen,
      toast: accountId ? toast : null,
      dismissToast: () => setToast(null),
      live,
      subscribe,
      resync,
    }),
    [accountId, orders, sorted, markSeen, toast, live, subscribe, resync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIncoming(): Incoming {
  const value = useContext(Ctx);
  if (!value) throw new Error('useIncoming must be used within IncomingProvider');
  return value;
}
