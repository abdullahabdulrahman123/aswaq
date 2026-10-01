import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIncoming } from '../context/IncomingContext';
import { egp } from '../data/catalog';

/** كام ثانية التنبيه بيفضل ظاهر */
const TOAST_MS = 8000;

/**
 * تنبيه صغير لما طلب وارد يوصل والمستخدم في صفحة تانية، بطلب العميل: «بس يجيلك
 * toast ما يزعلكش». الدوسة بتفتح «مهامي» (فيها الطلبات الواردة)، وبيختفي لوحده.
 */
export function IncomingToast() {
  const { toast, dismissToast } = useIncoming();
  const { selectedBusiness } = useAuth();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast || !selectedBusiness) return null;

  return (
    <div role="status" className="fixed inset-x-3 bottom-16 z-50 mx-auto max-w-sm print:hidden">
      <div className="flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-card dark:bg-white dark:text-stone-900">
        <Link to="/tasks" onClick={dismissToast} className="min-w-0 flex-1">
          <span className="block text-sm font-bold">طلب وارد جديد · فاتورة {toast.number}</span>
          <span className="block truncate text-xs opacity-80">
            {toast.names.buyer} · {toast.names.store} · {egp(toast.netTotal)}
          </span>
        </Link>
        <button type="button" onClick={dismissToast} aria-label="اقفل التنبيه" className="shrink-0 px-1 text-lg leading-none opacity-70 hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  );
}
