import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth, type BusinessAddress } from '../context/AuthContext';
import { AddressDialog, EMPTY_ADDRESS } from '../components/AddressDialog';
import { AddressCard } from '../components/AddressCard';

/**
 * صفحة النشاط التجاري.
 *
 * التسجيل بياخد اسم واختصار وبس، والعناوين بتتضاف من هنا — نشاط ممكن يكون
 * له فرع ومخزن ومكتب، وممكن يفضل من غير عنوان لحد ما صاحبه يجهّز مكانه.
 */
export function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { user, businesses, addAddress, updateAddress, removeAddress, signIn } = useAuth();
  // بنيجي هنا على طول بعد التسجيل — بنقول للمستخدم إنه تم قبل ما يسأل
  const justCreated = Boolean((useLocation().state as { created?: boolean } | null)?.created);

  /** null = مقفول، عنوان بـid فاضي = إضافة، عنوان بـid = تعديل */
  const [editing, setEditing] = useState<BusinessAddress | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          نشاطاتك التجارية بتبان بعد تسجيل الدخول.
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

  const business = businesses.find((b) => b.id === id);

  if (!business) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">النشاط ده مش موجود</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          يمكن يكون اتحذف، أو مسجّل على جهاز تاني — الأنشطة لسه محفوظة على المتصفح.
        </p>
        <Link
          to="/business/new"
          className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          أنشئ نشاط تجاري
        </Link>
      </div>
    );
  }

  function handleSave(address: BusinessAddress) {
    if (!business) return;
    if (address.id) updateAddress(business.id, address);
    else addAddress(business.id, address);
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {justCreated && (
        <p className="mb-5 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
          اتسجّل النشاط. تقدر تضيف عناوينه دلوقتي أو في أي وقت بعدين.
        </p>
      )}

      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 font-display text-xs font-bold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
          <span className="truncate px-1">{business.abbreviation}</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{business.name}</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">نشاط تجاري على أسواق</p>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            العناوين
            {business.addresses.length > 0 && (
              <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
                {business.addresses.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setEditing(EMPTY_ADDRESS)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
          >
            ＋ إضافة عنوان
          </button>
        </div>

        {business.addresses.length > 0 ? (
          <>
            <ul className="mt-4 grid gap-2.5">
              {business.addresses.map((a) => (
                <AddressCard
                  key={a.id}
                  address={a}
                  onEdit={() => setEditing(a)}
                  onDelete={() => removeAddress(business.id, a.id)}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-400">دوس على أي عنوان تشوفه بالكامل.</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-400 dark:border-white/15">
            مفيش عناوين لسه — دوس «إضافة عنوان» وضيف فرع أو مخزن أو مكتب.
          </p>
        )}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-stone-400">
        البيانات محفوظة على المتصفح ده دلوقتي، فمش هتلاقيها لو فتحت من جهاز تاني.
        ربطها بالحساب لسه في الطريق.
      </p>

      <AddressDialog
        open={editing !== null}
        value={editing ?? EMPTY_ADDRESS}
        mode={editing?.id ? 'edit' : 'add'}
        onSave={handleSave}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
