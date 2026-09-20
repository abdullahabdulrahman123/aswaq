import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth, type Premises } from '../context/AuthContext';
import { ContactsField } from '../components/ContactsField';
import { EMPTY_PREMISES, PremisesDialog } from '../components/PremisesDialog';
import { PremisesCard } from '../components/PremisesCard';
import { PicturePicker } from '../components/PicturePicker';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';

/**
 * صفحة النشاط التجاري — «بروفايل النشاط»، بطلب العميل: اسمه واختصاره
 * ولوجوه، وأرقامه العامة، وتحتهم ليستة مقراته (وأرقام كل مقر جواه).
 *
 * التسجيل بياخد اسم واختصار وبس، والمقرات بتتضاف من هنا — نشاط ممكن يكون
 * له فرع ومخزن ومتجر، وممكن يفضل من غير مقرات لحد ما صاحبه يجهّز مكانه.
 * كل ده متخزّن في وصلة، وأسواق بيعرضه ويبعت التعديلات.
 */
export function BusinessPage() {
  const { id } = useParams<{ id: string }>();
  const {
    user,
    businesses,
    businessesLoading,
    businessesError,
    addPremises,
    updatePremises,
    removePremises,
    addBusinessContact,
    updateBusinessContact,
    removeBusinessContact,
    setBusinessPicture,
    signIn,
  } = useAuth();
  // بنيجي هنا على طول بعد التسجيل — بنقول للمستخدم إنه تم قبل ما يسأل
  const justCreated = Boolean((useLocation().state as { created?: boolean } | null)?.created);

  /** null = مقفول، مقر بـid فاضي = إضافة، مقر بـid = تعديل */
  const [editing, setEditing] = useState<Premises | null>(null);

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
  async function handleSave(premises: Premises) {
    if (!business) return;
    const { id: premisesId, ...fields } = premises;
    if (premisesId) await updatePremises(business.accountId, premises);
    else await addPremises(business.accountId, fields);
    setEditing(null);
  }

  /** بترمي لو المسح فشل — زي الحفظ، الخطأ بيتعرض جوه النافذة */
  async function handleDelete(premisesId: string) {
    if (!business) return;
    await removePremises(business.accountId, premisesId);
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {justCreated && (
        <p className="mb-5 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
          اتسجّل النشاط. تقدر تضيف مقراته دلوقتي أو في أي وقت بعدين.
        </p>
      )}

      <SessionExpiredNotice />

      {/* اللوجو ده هو اللي في الناڤبار لما يتعامل بالنشاط، وقدام المشترين بعدين */}
      <PicturePicker
        kind="business"
        picture={business.picture}
        fallback={business.abbreviation}
        onSave={(picture) => setBusinessPicture(business.accountId, picture)}
        noun="لوجو"
      >
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{business.name}</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">نشاط تجاري على أسواق · {business.abbreviation}</p>
      </PicturePicker>

      {/* نفس أرقام التسجيل — هنا بتتضاف وتتعدل بعده، وبتتحفظ في وصلة على طول */}
      <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <h2 className="font-display text-lg font-bold">
          جهات الاتصال
          {business.contacts.length > 0 && (
            <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
              {business.contacts.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-xs text-stone-400">أرقام النشاط العامة. أرقام كل فرع بتتضاف من المقر بتاعه.</p>
        <div className="mt-4">
          <ContactsField
            contacts={business.contacts}
            ownerName={business.name}
            onAdd={(input) => addBusinessContact(business.accountId, input)}
            onUpdate={(contactId, input) => updateBusinessContact(business.accountId, contactId, input)}
            onRemove={(contactId) => removeBusinessContact(business.accountId, contactId)}
          />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            المقرات
            {business.premises.length > 0 && (
              <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
                {business.premises.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setEditing(EMPTY_PREMISES)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
          >
            ＋ إضافة مقر
          </button>
        </div>

        {business.premises.length > 0 ? (
          <>
            <ul className="mt-4 grid gap-2.5">
              {business.premises.map((p) => (
                <PremisesCard key={p.id} premises={p} onOpen={() => setEditing(p)} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-400">دوس على أي مقر تفتحه وتعدّله.</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-400 dark:border-white/15">
            مفيش مقرات لسه — دوس «إضافة مقر» وضيف فرع أو مخزن أو متجر.
          </p>
        )}
      </section>

      <PremisesDialog
        open={editing !== null}
        value={editing ?? EMPTY_PREMISES}
        mode={editing?.id ? 'edit' : 'add'}
        onSave={handleSave}
        onDelete={editing?.id ? () => handleDelete(editing.id) : undefined}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
