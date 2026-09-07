import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** أقصى طول للاختصار — بيظهر كشارة صغيرة فمينفعش يكون طويل */
const ABBR_MAX = 8;

/**
 * تسجيل نشاط تجاري جديد.
 *
 * البيانات دلوقتي اسم واختصار وبس، بطلب العميل. أي حاجة زيادة (سجل تجاري،
 * عنوان، تليفون) لسه بتتحدد، فمش بنسأل عنها عشان منعطّلش التسجيل.
 */
export function BusinessNewPage() {
  const { user, businesses, createBusiness, signIn } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [error, setError] = useState('');
  /** آخر نشاط اتسجّل — بنعرض تأكيد بدل ما نحوّل، لأن صفحة النشاطات لسه متعملتش */
  const [justCreated, setJustCreated] = useState<{ name: string; abbreviation: string } | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          تسجيل نشاط تجاري متاح بعد تسجيل الدخول.
        </p>
        <button
          onClick={() => signIn('login')}
          className="mt-6 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanAbbr = abbreviation.trim();

    if (!cleanName || !cleanAbbr) {
      setError('اكتب اسم النشاط والاختصار.');
      return;
    }
    // الاختصار بيتعرض كشارة، فتكراره بيخلي الأنشطة مش متميّزة عن بعض
    if (businesses.some((b) => b.abbreviation.toLowerCase() === cleanAbbr.toLowerCase())) {
      setError('الاختصار ده مستخدم في نشاط تاني عندك. اختار غيره.');
      return;
    }

    createBusiness({ name: cleanName, abbreviation: cleanAbbr });
    setJustCreated({ name: cleanName, abbreviation: cleanAbbr });
    setName('');
    setAbbreviation('');
  }

  if (justCreated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 text-center dark:border-accent-500/25 dark:bg-accent-500/10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white font-display text-sm font-bold text-brand-800 dark:bg-white/10 dark:text-brand-200">
            <span className="truncate px-1">{justCreated.abbreviation}</span>
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">اتسجّل النشاط</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            «{justCreated.name}» بقى في قائمة نشاطاتك — تلاقيه تحت اسمك فوق.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setJustCreated(null)}
              className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:border-brand-400 dark:border-white/15 dark:bg-transparent"
            >
              سجّل نشاط تاني
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              تمام
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">أنشئ نشاط تجاري</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        سجّل نشاطك عشان تبدأ تبيع على أسواق.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">اسم النشاط التجاري</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            required
            maxLength={80}
            placeholder="مثال: شركة النور للتجارة"
            className="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 outline-none transition focus:border-brand-500 dark:border-white/15"
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">الاختصار</span>
          <input
            value={abbreviation}
            onChange={(e) => {
              setAbbreviation(e.target.value);
              setError('');
            }}
            required
            maxLength={ABBR_MAX}
            placeholder="مثال: النور"
            className="w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 outline-none transition focus:border-brand-500 dark:border-white/15"
          />
          <span className="mt-1.5 block text-xs text-stone-400">
            اسم قصير بيظهر كشارة جنب نشاطك — {ABBR_MAX} حروف كحد أقصى.
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            سجّل النشاط
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
          >
            إلغاء
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        البيانات محفوظة على المتصفح ده دلوقتي، فمش هتلاقيها لو فتحت من جهاز تاني.
        ربطها بالحساب لسه في الطريق.
      </p>
    </div>
  );
}
