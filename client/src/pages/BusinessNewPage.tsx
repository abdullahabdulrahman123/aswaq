import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notch, fieldClass } from '../components/OutlinedField';

/** أقصى طول للاختصار — بيظهر كشارة صغيرة فمينفعش يكون طويل */
const ABBR_MAX = 8;

/**
 * تسجيل نشاط تجاري جديد — اسم واختصار وبس.
 *
 * العناوين مش جزء من التسجيل: النشاط ممكن يكون لسه مالوش مكان، وممكن يكون
 * له كذا فرع. بيتضافوا من صفحة النشاط نفسها بعد ما يتسجّل.
 */
export function BusinessNewPage() {
  const { user, businesses, createBusiness, signIn } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [error, setError] = useState('');

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

    const created = createBusiness({ name: cleanName, abbreviation: cleanAbbr });
    // على طول لصفحة النشاط — منها بيضيف العناوين
    navigate(`/business/${created.id}`, { state: { created: true } });
  }

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
        {/* mt-2 على الأولى: اسم الخانة طالع فوق حدّها بـ٨ بكسل */}
        <label className="relative mt-2 block">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            required
            maxLength={80}
            placeholder="مثال: شركة النور للتجارة"
            className={fieldClass}
          />
          <Notch>اسم النشاط التجاري</Notch>
        </label>

        <label className="relative mt-6 block">
          <input
            value={abbreviation}
            onChange={(e) => { setAbbreviation(e.target.value); setError(''); }}
            required
            maxLength={ABBR_MAX}
            placeholder="مثال: النور"
            className={fieldClass}
          />
          <Notch>الاختصار</Notch>
          <span className="mt-1.5 block text-xs text-stone-400">
            اسم قصير بيظهر كشارة جنب نشاطك — {ABBR_MAX} حروف كحد أقصى.
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
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

        <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-400 dark:border-white/10">
          العناوين بتتضاف بعد التسجيل من صفحة النشاط — تقدر تضيف أكتر من عنوان،
          أو تسيبه من غير عنوان دلوقتي.
        </p>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        البيانات محفوظة على المتصفح ده دلوقتي، فمش هتلاقيها لو فتحت من جهاز تاني.
        ربطها بالحساب لسه في الطريق.
      </p>
    </div>
  );
}
