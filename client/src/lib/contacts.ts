/**
 * جهات الاتصال: رقم أو لينك صفحة، متخزّنة في وصلة (جدول contacts) بطلب العميل.
 * بتتضاف من ٤ أماكن بنفس الواجهة (ContactsField): تسجيل النشاط، وصفحة النشاط،
 * وفورم المقر مع العنوان، و«حسابي».
 *
 * القواعد هنا نسخة من وصلة (server/src/schemas/contact.schema.ts) عشان الغلط
 * يبان وهو بيكتب — وصلة بتفحص تاني وهي الحكم الأخير. أي تغيير هنا يتعمل هناك.
 */

/** الأرضي والرقم المختصر بطلب العميل بالاسم، والسوشيال فيسبوك بس دلوقتي */
export type ContactType = 'mobile' | 'whatsapp' | 'landline' | 'short_number' | 'facebook';

export interface Contact {
  /** id في وصلة. في فورم لسه متحفظش (تسجيل نشاط، مقر) بيبقى id مؤقت من draftId */
  id: string;
  type: ContactType;
  /** زي ما اتخزّن: أرقام إنجليزي من غير مسافات، أو لينك كامل بـhttps */
  value: string;
}

/** اللي بيتبعت لوصلة — من غير id */
export type ContactInput = Omit<Contact, 'id'>;

/** نفس حد وصلة: للحساب الواحد أو المقر الواحد */
export const MAX_CONTACTS = 20;

interface ContactTypeInfo {
  type: ContactType;
  label: string;
  /** اسم الخانة في النافذة */
  field: string;
  placeholder: string;
  inputMode: 'tel' | 'numeric' | 'url';
  hint: string;
  /** الرسالة لما القيمة متبقاش مظبوطة للنوع ده */
  error: string;
}

/** بالترتيب اللي بيظهر بيه في النافذة */
export const CONTACT_TYPES: readonly ContactTypeInfo[] = [
  {
    type: 'mobile',
    label: 'موبايل',
    field: 'رقم الموبايل',
    placeholder: '01012345678',
    inputMode: 'tel',
    hint: '١١ رقم بيبدأ بـ01.',
    error: 'رقم الموبايل لازم يبقى ١١ رقم ويبدأ بـ010 أو 011 أو 012 أو 015.',
  },
  {
    type: 'whatsapp',
    label: 'واتساب',
    field: 'رقم الواتساب',
    placeholder: '01012345678',
    inputMode: 'tel',
    hint: 'رقم الموبايل اللي عليه واتساب.',
    error: 'رقم الواتساب لازم يبقى رقم موبايل: ١١ رقم ويبدأ بـ01.',
  },
  {
    type: 'landline',
    label: 'أرضي',
    field: 'الرقم الأرضي',
    placeholder: '0223456789',
    inputMode: 'tel',
    hint: 'بكود المحافظة، زي 02 للقاهرة أو 050 للمنصورة.',
    error: 'اكتب الرقم الأرضي بكود المحافظة، زي 0223456789.',
  },
  {
    type: 'short_number',
    label: 'رقم مختصر',
    field: 'الرقم المختصر',
    placeholder: '19019',
    inputMode: 'numeric',
    hint: 'من ٣ لـ٥ أرقام، زي 19019.',
    error: 'الرقم المختصر من ٣ لـ٥ أرقام بس.',
  },
  {
    type: 'facebook',
    label: 'فيسبوك',
    field: 'لينك الصفحة',
    placeholder: 'facebook.com/…',
    inputMode: 'url',
    hint: 'انسخ لينك الصفحة من فيسبوك وحطه هنا.',
    error: 'حط لينك صفحة فيسبوك، زي facebook.com/اسم الصفحة.',
  },
];

export function contactTypeInfo(type: ContactType): ContactTypeInfo {
  return CONTACT_TYPES.find((info) => info.type === type) ?? CONTACT_TYPES[0];
}

/**
 * الرقم زي ما هيتخزن: أرقام إنجليزي بس. الكيبورد العربي بيكتب ٠١٢…، والنسخ
 * من أي حتة بيجيب مسافات وشُرَط وأقواس وعلامات اتجاه مش باينة.
 */
function digitsOf(raw: string): string {
  return raw
    .replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(/[\s\-.()/\u200e\u200f\u202a-\u202e]/g, '');
}

/** كود مصر الدولي بيتشال: +20 / 0020 بيبقوا 0، و20 قبل رقم موبايل (زي لينكات واتساب) كمان */
function localEgyptian(raw: string): string {
  const value = digitsOf(raw).replace(/^(?:\+|00)20/, '0');
  return value.replace(/^20(1[0125]\d{8})$/, '0$1');
}

const MOBILE = /^01[0125]\d{8}$/;
/** القاهرة والجيزة 02 + ٨ أرقام، إسكندرية 03 + ٧، وباقي المحافظات كود من ٣ أرقام + ٧ (منهم 013 و015) */
const LANDLINE = /^(?:0[2-9]\d{7,8}|01[35]\d{7})$/;
const SHORT_NUMBER = /^\d{3,5}$/;

function facebookLink(raw: string): string | null {
  let text = raw.trim();
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const isFacebook = host === 'facebook.com' || host.endsWith('.facebook.com') || ['fb.com', 'www.fb.com', 'fb.me'].includes(host);
  const path = url.pathname.replace(/\/+$/, '');
  if (!isFacebook || !path) return null;
  // profile.php?id=… هو الحساب نفسه؛ أي query تاني تتبّع مشاركة ملوش لازمة
  const profileId = path.toLowerCase() === '/profile.php' ? url.searchParams.get('id') : null;
  if (path.toLowerCase() === '/profile.php' && !profileId) return null;
  return `https://${host}${path}${profileId ? `?id=${encodeURIComponent(profileId)}` : ''}`;
}

/** القيمة زي ما وصلة هتخزنها، أو null لو مش مظبوطة للنوع ده */
export function normalizeContactValue(type: ContactType, raw: string): string | null {
  switch (type) {
    case 'mobile':
    case 'whatsapp': {
      const value = localEgyptian(raw);
      return MOBILE.test(value) ? value : null;
    }
    case 'landline': {
      const value = localEgyptian(raw);
      return LANDLINE.test(value) ? value : null;
    }
    case 'short_number': {
      const value = digitsOf(raw);
      return SHORT_NUMBER.test(value) ? value : null;
    }
    case 'facebook': {
      const value = facebookLink(raw);
      return value && value.length <= 200 ? value : null;
    }
  }
}

/** للعرض: اللينك من غير https وwww، وبالحروف العربي لو اسم الصفحة عربي */
export function displayContactValue({ type, value }: ContactInput): string {
  if (type !== 'facebook') return value;
  let shown = value.replace(/^https:\/\/(www\.)?/, '');
  try {
    shown = decodeURI(shown);
  } catch {
    // لينك فيه % مش ترميز — يتعرض زي ما هو
  }
  return shown;
}

/**
 * القيمة اللي بتتملي في الخانة وقت التعديل: اللينك كامل بحروفه العربي، عشان
 * الحفظ من غير تغيير يرجّع نفس القيمة المتخزنة بالظبط (العرض بيشيل https وwww).
 */
export function editableContactValue({ type, value }: ContactInput): string {
  if (type !== 'facebook') return value;
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

let nextDraftId = 0;
/** id مؤقت لجهة اتصال في فورم لسه متحفظش — وصلة بتدي الحقيقي وقت الحفظ */
export function draftId(): string {
  nextDraftId += 1;
  return `draft-${nextDraftId}`;
}

/** اللي بيتبعت لوصلة من ليستة — النوع والقيمة بس */
export function contactInputs(contacts: Contact[]): ContactInput[] {
  return contacts.map(({ type, value }) => ({ type, value }));
}
