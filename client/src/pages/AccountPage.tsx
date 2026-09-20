import { useAuth } from '../context/AuthContext';
import { personInitial } from '../components/Avatar';
import { ContactsField } from '../components/ContactsField';
import { PicturePicker } from '../components/PicturePicker';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';

/**
 * صفحة الحساب في أسواق — ومنها صورة الحساب اللي بتظهر في الناڤبار، وأرقامه
 * (بطلب العميل: من هنا، مش وقت التسجيل في وصلة).
 *
 * أغلب المستخدمين مشترين مش بائعين، فأي كلام عن البيع والنشاط التجاري
 * مبيظهرش غير بعد ما يكون فيه نشاط فعلاً. إنشاء النشاط وإدارته في المنيو
 * اللي بتفتح من الصورة فوق.
 */
export function AccountPage() {
  const {
    user,
    businesses,
    signIn,
    setUserPicture,
    sessionExpired,
    userContacts,
    userContactsError,
    addUserContact,
    updateUserContact,
    removeUserContact,
  } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">سجّل دخولك الأول</h1>
        <p className="mt-3 leading-relaxed text-stone-500 dark:text-stone-400">
          صفحة الحساب متاحة بعد تسجيل الدخول.
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">حسابي</h1>

      <div className="mt-5">
        <SessionExpiredNotice />
      </div>

      {/* الهوية — من وصلة، والصورة دي هي اللي في الناڤبار لما يتعامل بحسابه */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <PicturePicker
          kind="person"
          picture={user.picture}
          fallback={personInitial(user.name, user.email)}
          onSave={setUserPicture}
          noun="صورة"
        >
          <div className="font-display text-lg font-bold">
            {user.name ?? 'مستخدم'}
            {user.demo && <span className="ms-2 text-sm font-normal text-amber-600 dark:text-amber-400">(تجريبي)</span>}
          </div>
          {user.email && <div className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{user.email}</div>}
          {/* الشارة للشركات بس — المشتري العادي مش محتاج تصنيف */}
          {businesses.length > 0 && (
            <div className="mt-2 inline-block rounded-md bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
              حساب شركة
            </div>
          )}
        </PicturePicker>
        <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-relaxed text-stone-400 dark:border-white/10">
          تعديل بياناتك الشخصية وكلمة السر هيتضاف في مرحلة جاية.
        </p>
      </section>

      {/* الأرقام في وصلة مع الحساب — بتتحفظ على طول، زي الصورة */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <h2 className="font-display text-lg font-bold">
          جهات الاتصال
          {userContacts && userContacts.length > 0 && (
            <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
              {userContacts.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-xs text-stone-400">أرقامك وطرق التواصل معاك.</p>
        <div className="mt-4">
          {userContacts ? (
            <ContactsField
              contacts={userContacts}
              ownerName={user.name}
              onAdd={addUserContact}
              onUpdate={updateUserContact}
              onRemove={removeUserContact}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-400 dark:border-white/15">
              {user.demo
                ? 'الأرقام بتتحفظ في وصلة — محتاجة تسجيل دخول حقيقي.'
                : userContactsError || (sessionExpired ? 'سجّل دخول تاني عشان تشوف أرقامك.' : 'بنجيب أرقامك من وصلة…')}
            </p>
          )}
        </div>
      </section>

      {businesses.length > 0 && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          <h2 className="font-display text-lg font-bold">النشاط التجاري</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            عندك {businesses.length} نشاط مسجّل. دوس على صورتك فوق عشان تتعامل بأي واحد
            فيهم أو بحسابك الشخصي.
          </p>
        </section>
      )}

    </div>
  );
}
