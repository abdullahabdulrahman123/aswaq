import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumeReturnTo, decodeIdToken, exchangeCode, validateState } from '../lib/waslaAuth';

/** المستخدم راجع من وصلة — نبدّل الكود بـtoken ونكمّل من حيث وقف */
export function AuthCallbackPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const code = params.get('code');
      const state = params.get('state');
      const oidcError = params.get('error');

      if (oidcError) {
        setError(params.get('error_description') || 'وصلة رفضت طلب تسجيل الدخول.');
        return;
      }
      if (!code || !validateState(state)) {
        setError('رد وصلة غير صالح. حاول تسجّل تاني.');
        return;
      }

      try {
        const idToken = await exchangeCode(code);
        setUser(decodeIdToken(idToken));
        navigate(consumeReturnTo(), { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'حصلت مشكلة أثناء تسجيل الدخول.');
      }
    })();
  }, [params, setUser, navigate]);

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 text-center">
      {error ? (
        <div>
          <h1 className="font-display text-xl font-bold">تعذّر تسجيل الدخول</h1>
          <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">{error}</p>
          <Link to="/" className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600">
            ارجع للرئيسية
          </Link>
        </div>
      ) : (
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-brand-500 motion-reduce:animate-none dark:border-white/15 dark:border-t-brand-400" />
          <p className="mt-4 text-stone-500 dark:text-stone-400">بنكمّل تسجيل الدخول عبر وصلة…</p>
        </div>
      )}
    </div>
  );
}
