import { useState } from 'react';
import { useAuth, type BusinessAddress } from '../context/AuthContext';
import { AddressDialog, EMPTY_ADDRESS } from '../components/AddressDialog';
import { personInitial } from '../components/Avatar';
import { ContactsField } from '../components/ContactsField';
import { PicturePicker } from '../components/PicturePicker';
import { PinIcon } from '../components/PinIcon';
import { SessionExpiredNotice } from '../components/SessionExpiredNotice';
import { oneLine } from '../lib/address';

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
    userAddresses,
    userAddressesError,
    addUserAddress,
    updateUserAddress,
    removeUserAddress,
  } = useAuth();

  /** null = مقفول، عنوان بـid فاضي = إضافة، عنوان بـid = تعديل */
  const [editingAddress, setEditingAddress] = useState<BusinessAddress | null>(null);
  const [confirmingId, setConfirmingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [addressError, setAddressError] = useState('');

  async function handleRemoveAddress(addressId: string) {
    setDeletingId(addressId);
    setAddressError('');
    try {
      await removeUserAddress(addressId);
      setConfirmingId('');
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'مقدرناش نمسح العنوان. جرّب تاني.');
    } finally {
      setDeletingId('');
    }
  }

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

  const contactsHeading = (
    <>
      <h2 className="font-display text-lg font-bold">
        جهات الاتصال
        {userContacts && userContacts.length > 0 && (
          <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
            {userContacts.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs text-stone-400">أرقامك وطرق التواصل معاك.</p>
    </>
  );

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
        {userContacts ? (
          <ContactsField
            heading={contactsHeading}
            contacts={userContacts}
            ownerName={user.name}
            onAdd={addUserContact}
            onUpdate={updateUserContact}
            onRemove={removeUserContact}
          />
        ) : (
          <>
            {contactsHeading}
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-400 dark:border-white/15">
              {user.demo
                ? 'الأرقام بتتحفظ في وصلة — محتاجة تسجيل دخول حقيقي.'
                : userContactsError || (sessionExpired ? 'سجّل دخول تاني عشان تشوف أرقامك.' : 'بنجيب أرقامك من وصلة…')}
            </p>
          </>
        )}
      </section>

      {/* «عناويني» في وصلة مع الحساب — المشتري بيختار منها مكانه في المتاجر */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            عناويني
            {userAddresses && userAddresses.length > 0 && (
              <span className="ms-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums font-normal text-stone-500 dark:bg-white/10 dark:text-stone-400">
                {userAddresses.length}
              </span>
            )}
          </h2>
          {userAddresses && (
            <button
              type="button"
              onClick={() => setEditingAddress(EMPTY_ADDRESS)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
            >
              ＋ إضافة عنوان
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-stone-400">البيت أو الشغل — بتختار منهم مكانك في المتاجر.</p>

        {addressError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {addressError}
          </p>
        )}

        {userAddresses ? (
          userAddresses.length > 0 ? (
            <ul aria-label="عناويني" className="mt-4 grid gap-2.5">
              {userAddresses.map((address) => (
                <li
                  key={address.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 px-4 py-3 dark:border-white/10"
                >
                  <PinIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                  <span className="min-w-0 flex-1 text-sm leading-relaxed">{oneLine(address)}</span>
                  {/* تأكيد في المكان بدل نافذة المتصفح — المسح مالوش رجعة */}
                  {confirmingId === address.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 dark:text-stone-400">متأكد؟</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(address.id)}
                        disabled={deletingId === address.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-progress disabled:opacity-70"
                      >
                        {deletingId === address.id ? 'بنمسح…' : 'امسح'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId('')}
                        disabled={deletingId === address.id}
                        className="rounded-lg px-2 py-1.5 text-xs text-stone-500 transition hover:text-stone-700 disabled:opacity-60 dark:text-stone-400"
                      >
                        رجوع
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAddress(address)}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(address.id);
                          setAddressError('');
                        }}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
                      >
                        مسح
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-400 dark:border-white/15">
              مفيش عناوين لسه.
            </p>
          )
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-400 dark:border-white/15">
            {user.demo
              ? 'العناوين بتتحفظ في وصلة — محتاجة تسجيل دخول حقيقي.'
              : userAddressesError || (sessionExpired ? 'سجّل دخول تاني عشان تشوف عناوينك.' : 'بنجيب عناوينك من وصلة…')}
          </p>
        )}
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

      <AddressDialog
        open={editingAddress !== null}
        value={editingAddress ?? EMPTY_ADDRESS}
        premisesName=""
        placeNoun="العنوان"
        onDone={async (address) => {
          if (address.id) await updateUserAddress(address);
          else await addUserAddress(address);
          setEditingAddress(null);
        }}
        onClose={() => setEditingAddress(null)}
      />
    </div>
  );
}
