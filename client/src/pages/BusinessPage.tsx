import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth, type BusinessAddress } from '../context/AuthContext';
import { AddressDialog, EMPTY_ADDRESS } from '../components/AddressDialog';
import { AddressCard } from '../components/AddressCard';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { SessionExpiredError } from '../lib/waslaApi';

/**
 * صفحة النشاط التجاري.
 *
 * التسجيل بياخد اسم واختصار وبس، والعناوين بتتضاف من هنا — نشاط ممكن يكون
 * له فرع ومخزن ومكتب، وممكن يفضل من غير عنوان لحد ما صاحبه يجهّز مكانه.
 * كل ده متخزّن في وصلة، وأسواق بيعرضه ويبعت التعديلات.
 */
export function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const {
    user,
    businesses,
    businessesLoading,
    businessesError,
    addAddress,
    updateAddress,
    removeAddress,
    signIn,
  } = useAuth();
  // بنيجي هنا على طول بعد التسجيل — بنقول للمستخدم إنه تم قبل ما يسأل
  const justCreated = Boolean((useLocation().state as { created?: boolean } | null)?.created);

  /** null = مقفول، عنوان بـid فاضي = إضافة، عنوان بـid = تعديل */
  const [editing, setEditing] = useState<BusinessAddress | null>(null);
  /** خطأ الحذف. أخطاء الإضافة والتعديل بتتعرض جوه النافذة نفسها */
  const [deleteError, setDeleteError] = useState('');

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

  const business = businesses.find((b) => b.accountId === id);

  if (!business) {
    // القايمة لسه جاية من وصلة — "مش موجود" دلوقتي ممكن تبقى غلط
    if (businessesLoading) {
      return (
        <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 text-center">
          <div>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-brand-500 motion-reduce:animate-none dark:border-white/15 dark:border-t-brand-400" />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">بنجيب بيانات النشاط من وصلة…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <SessionExpiredNotice />
        <h1 className="font-display text-2xl font-bold">
          {businessesError ? 'مقدرناش نجيب النشاط' : 'النشاط ده مش موجود'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {businessesError || 'يمكن يكون اتحذف، أو تبع حساب تاني.'}
        </p>
        {businessesError ? (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            جرّب تاني
          </button>
        ) : (
          <Link
            to="/business/new"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            أنشئ نشاط تجاري
          </Link>
        )}
      </div>
    );
  }

  /** بترمي لو الحفظ فشل — النافذة بتمسك الخطأ وتعرضه وتفضل مفتوحة */
  async function handleSave(address: BusinessAddress) {
    if (!business) return;
    const { id: addressId, ...fields } = address;
    if (addressId) await updateAddress(business.accountId, address);
    else await addAddress(business.accountId, fields);
    setEditing(null);
  }

  async function handleDelete(addressId: string) {
    if (!business) return;
    setDeleteError('');
    try {
      await removeAddress(business.accountId, addressId);
    } catch (err) {
      // انتهاء الجلسة ليه تنبيه لوحده فوق
      if (!(err instanceof SessionExpiredError)) {
        setDeleteError(err instanceof Error ? err.message : 'مقدرناش نحذف العنوان. جرّب تاني.');
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {justCreated && (
        <p className="mb-5 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
          اتسجّل النشاط. تقدر تضيف عناوينه دلوقتي أو في أي وقت بعدين.
        </p>
      )}

      <SessionExpiredNotice />

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

        {deleteError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {deleteError}
          </p>
        )}

        {business.addresses.length > 0 ? (
          <>
            <ul className="mt-4 grid gap-2.5">
              {business.addresses.map((a) => (
                <AddressCard
                  key={a.id}
                  address={a}
                  onEdit={() => setEditing(a)}
                  onDelete={() => handleDelete(a.id)}
                />
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-400">دوس على أي عنوان تشوفه بالكامل.</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-400 dark:border-white/15">
            مفيش عناوين لسه — دوس «إضافة عنوان» وضيف مخزن أو متجر.
          </p>
        )}
      </section>

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
