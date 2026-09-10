import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type BusinessAddress } from '../context/AuthContext';
import { AddressDialog } from '../components/AddressDialog';
import type { Coords } from '../lib/geolocate';

/** أقصى طول للاختصار — بيظهر كشارة صغيرة فمينفعش يكون طويل */
const ABBR_MAX = 8;

/** وسط القاهرة — نقطة بداية الخريطة قبل ما المستخدم يحدد حاجة */
const DEFAULT_POINT: Coords = { lat: 30.0444, lng: 31.2357 };

const EMPTY_ADDRESS: BusinessAddress = {
  label: '',
  description: '',
  country: 'مصر',
  governorate: '',
  city: '',
  district: '',
  street: '',
  landmark: '',
  lat: DEFAULT_POINT.lat,
  lng: DEFAULT_POINT.lng,
};

const fieldClass =
  'w-full rounded-xl border border-stone-300 bg-transparent px-3 py-2.5 outline-none transition focus:border-brand-500 dark:border-white/15';

/**
 * تسجيل نشاط تجاري جديد.
 *
 * العنوان: الدولة والمحافظة من قوايم ثابتة، والمدينة قايمة بتقبل الكتابة كمان
 * (مصر فيها مئات المدن، والقايمة عندنا بالمراكز الرئيسية بس). الحي والشارع
 * والعلامة المميزة كتابة حرة.
 *
 * زرار "حدّد موقعي" بيملا الدولة والمحافظة والمدينة، والخانات بتفضل قابلة
 * للتعديل بعدها — تحديد الموقع على الكمبيوتر بيعتمد على الـIP وممكن يغلط.
 */
export function BusinessNewPage() {
  const { user, businesses, createBusiness, signIn } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [address, setAddress] = useState<BusinessAddress>(EMPTY_ADDRESS);
  const [error, setError] = useState('');

  const [addressOpen, setAddressOpen] = useState(false);

  /** آخر نشاط اتسجّل — بنعرض تأكيد بدل ما نحوّل، لأن صفحة النشاطات لسه متعملتش */
  const [justCreated, setJustCreated] = useState<{ name: string; abbreviation: string } | null>(null);

  /** العنوان يعتبر متحدد لما يبقى فيه محافظة ومدينة */
  const hasAddress = Boolean(address.governorate && address.city.trim());

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
    if (!hasAddress) {
      setError('حدّد عنوان النشاط.');
      return;
    }

    // العنوان اتنضّف خلاص وقت حفظه من الدايالوج
    createBusiness({ name: cleanName, abbreviation: cleanAbbr, address });
    setJustCreated({ name: cleanName, abbreviation: cleanAbbr });
    setName('');
    setAbbreviation('');
    setAddress(EMPTY_ADDRESS);
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
            onChange={(e) => { setName(e.target.value); setError(''); }}
            required
            maxLength={80}
            placeholder="مثال: شركة النور للتجارة"
            className={fieldClass}
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">الاختصار</span>
          <input
            value={abbreviation}
            onChange={(e) => { setAbbreviation(e.target.value); setError(''); }}
            required
            maxLength={ABBR_MAX}
            placeholder="مثال: النور"
            className={fieldClass}
          />
          <span className="mt-1.5 block text-xs text-stone-400">
            اسم قصير بيظهر كشارة جنب نشاطك — {ABBR_MAX} حروف كحد أقصى.
          </span>
        </label>

        {/* ————— العنوان ————— */}
        <div className="mt-7 border-t border-stone-200 pt-5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">العنوان</h2>
            <button
              type="button"
              onClick={() => setAddressOpen(true)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
            >
              {hasAddress ? 'تعديل العنوان' : '＋ حدّد العنوان'}
            </button>
          </div>

          {hasAddress ? (
            <div className="mt-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-white/5">
              {address.label && <div className="font-display font-bold">{address.label}</div>}
              <div className={address.label ? 'mt-0.5 text-stone-600 dark:text-stone-300' : 'font-medium'}>
                {[address.governorate, address.city, address.district, address.street]
                  .filter(Boolean)
                  .join('، ')}
              </div>
              {address.landmark && (
                <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{address.landmark}</div>
              )}
              {address.description && (
                <div className="mt-1 text-xs leading-relaxed text-stone-400">{address.description}</div>
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-400 dark:border-white/15">
              لسه مش محدد — دوس «حدّد العنوان» وهتلاقي خريطة تظبط عليها المكان.
            </p>
          )}
        </div>

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
      </form>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        البيانات محفوظة على المتصفح ده دلوقتي، فمش هتلاقيها لو فتحت من جهاز تاني.
        ربطها بالحساب لسه في الطريق.
      </p>

      {/* بره الفورم عن قصد — <dialog> جوه <form> بيعمل تداخل مش محتاجينه */}
      <AddressDialog
        open={addressOpen}
        value={address}
        onSave={(next) => {
          setAddress(next);
          setAddressOpen(false);
          setError('');
        }}
        onClose={() => setAddressOpen(false)}
      />
    </div>
  );
}
