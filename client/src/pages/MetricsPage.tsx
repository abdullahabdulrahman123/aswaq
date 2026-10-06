import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { useAuth } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { fetchMetrics, type BusinessMetrics } from '../lib/aswaqApi';
import { egp } from '../lib/money';
import { PERMISSIONS, can, deniedMessage } from '../lib/permissions';
import { ApiError, SessionExpiredError } from '../lib/waslaApi';

/**
 * «مؤشرات المبيعات» (مكالمة ٦ أكتوبر، «بيزنس ميتريكس») — عشان الشركاء «عينهم وعقلهم
 * معلّق بالتطبيق»: احنا بعنا بكام النهارده، ومعانا قد إيه في العربيات، ومعانا أوردرات
 * للأيام الجاية قد إيه. ولكل مقر نفس التلاتة.
 *
 * الأرقام من جدول business_metrics، والسيرفر بيحسبه من الأوردرات مع كل حركة. الصفحة
 * بتتحدّث لوحدها مع «مهامي» (الـsocket بتاع الطلبات الواردة) ولما ترجع لها. معدلات
 * البيع لسه طريقة حسابها هتتحدد، فمش هنا.
 *
 * لصاحب الشركة وللموظف اللي معاه «مؤشرات المبيعات».
 */
export function MetricsPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, selectedBusiness, withToken, sessionExpired } = useAuth();
  const { orders: incoming } = useIncoming();
  const business = businesses.find((b) => b.accountId === accountId);
  const allowed = can(business, PERMISSIONS.salesMetrics);

  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user || sessionExpired || !business || !allowed) return () => undefined;
    let cancelled = false;
    withToken((token) => fetchMetrics(token, accountId))
      .then((next) => {
        if (cancelled) return;
        setMetrics(next);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setError(err instanceof ApiError && err.status === 403 ? deniedMessage(PERMISSIONS.salesMetrics) : 'مقدرناش نجيب المؤشرات. جرّب كمان شوية.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, sessionExpired, business, allowed, withToken, accountId]);

  // أول مرة، ومع كل حركة في فواتير النشاط ده (تأكيد، مرحلة، إتمام، إلغاء) — من «مهامي» اللي شغالة لحظة بلحظة
  const following = selectedBusiness?.accountId === accountId ? incoming : null;
  useEffect(() => load(), [load, following]);

  // رجع للصفحة (تاب تاني أو التطبيق كان في الخلفية): الأرقام من جديد
  useEffect(() => {
    const again = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', again);
    window.addEventListener('focus', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('focus', again);
    };
  }, [load]);

  if (!user) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">سجّل دخولك الأول.</p>;
  }
  if (!business) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        {businessesLoading ? 'بنجيب النشاط…' : 'النشاط ده مش موجود.'}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">مؤشرات المبيعات</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-200">{business.name}</span>
        {metrics && <span data-day> · {dayLabel(metrics.date)}</span>}
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {!allowed ? (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {deniedMessage(PERMISSIONS.salesMetrics)}
        </p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : !metrics ? (
        !sessionExpired && <p className="text-sm text-gray-500 dark:text-gray-400">بنجيب المؤشرات…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Stat name="achieved" label="اتباع النهارده" hint="فواتير اتمت النهارده" value={metrics.achieved} tone="text-green-700 dark:text-green-400" />
            <Stat name="inProcess" label="في الطريق" hint="عدّت التأكيد ولسه مخلصتش" value={metrics.inProcess} tone="text-amber-700 dark:text-amber-400" />
            <Stat name="future" label="طلبات جاية" hint="مؤكدة ولسه متجهزتش" value={metrics.future} tone="text-brand-700 dark:text-brand-300" />
          </div>

          {metrics.premises.length > 0 && (
            <section aria-label="بالمقر" className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">بالمقر</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-surface-card">
                <table className="w-full table-fixed text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] text-gray-400 dark:border-white/10">
                      <th className="w-[34%] px-3 py-1.5 text-start font-normal">المقر</th>
                      <th className="py-1.5 text-center font-normal">النهارده</th>
                      <th className="py-1.5 text-center font-normal">في الطريق</th>
                      <th className="py-1.5 text-center font-normal">جاية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.premises.map((p) => (
                      <tr key={p.premisesId} data-premises={p.name} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                        <td className="break-words px-3 py-2 text-start font-semibold leading-snug">{p.name}</td>
                        <td className="py-2 text-center text-xs">{amount(p.achieved)}</td>
                        <td className="py-2 text-center text-xs">{amount(p.inProcess)}</td>
                        <td className="py-2 text-center text-xs">{amount(p.future)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** في الجدول من غير «ج.م» — العمود كله فلوس */
const amount = (piastres: number) => egp(piastres).replace(' ج.م', '');

/** «الثلاثاء، 6 أكتوبر» — اليوم بتوقيت مصر زي ما السيرفر حسبه */
const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });

function Stat({ name, label, hint, value, tone }: { name: string; label: string; hint: string; value: number; tone: string }) {
  return (
    <div data-stat={name} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-card">
      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone}`}>{egp(value)}</div>
      <div className="mt-0.5 text-xs text-gray-400">{hint}</div>
    </div>
  );
}
