import { useState, type ChangeEvent, type ReactNode } from 'react';
import { SessionExpiredError } from '../lib/waslaApi';
import { uploadImage, uploadsConfigured } from '../lib/cloudinary';
import { Avatar } from './Avatar';

interface Props {
  kind: 'person' | 'business';
  picture: string | null | undefined;
  /** اللي بيظهر من غير صورة: أول حرف للشخص، والاختصار للنشاط */
  fallback: string;
  /** بيحفظ الرابط في وصلة. null = شيل الصورة. بيرمي لو فشل */
  onSave: (picture: string | null) => Promise<void>;
  /** «صورة» للشخص و«لوجو» للنشاط — بتدخل في أسامي الزراير */
  noun: string;
  /** الاسم وأي حاجة تتكتب جنب الصورة */
  children: ReactNode;
}

const buttonClass =
  'rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:hover:text-brand-400';

/**
 * الصورة الكبيرة في صفحة الحساب وصفحة النشاط، وزراير تغييرها جنبها. نفس
 * الصورة اللي بتظهر في الناڤبار. الملف بيترفع على Cloudinary أول ما يتختار،
 * ووصلة بتحفظ الرابط بس — زي صور الأصناف.
 */
export function PicturePicker({ kind, picture, fallback, onSave, noun, children }: Props) {
  const [busy, setBusy] = useState<'' | 'upload' | 'remove'>('');
  const [error, setError] = useState('');

  async function run(action: 'upload' | 'remove', work: () => Promise<void>) {
    setBusy(action);
    setError('');
    try {
      await work();
    } catch (err) {
      // انتهاء الجلسة ليه تنبيه لوحده فوق الصفحة
      if (!(err instanceof SessionExpiredError)) {
        setError(err instanceof Error ? err.message : `مقدرناش نحفظ ال${noun}. جرّب تاني.`);
      }
    } finally {
      setBusy('');
    }
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // بنفضّي الخانة عشان لو اختار نفس الملف تاني الحدث يشتغل
    e.target.value = '';
    if (!file) return;
    void run('upload', async () => onSave(await uploadImage(file)));
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar kind={kind} picture={picture} fallback={fallback} size={72} />
        <div className="min-w-0 flex-1">
          {children}
          {uploadsConfigured && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label
                className={`${buttonClass} cursor-pointer focus-within:ring-2 focus-within:ring-brand-300 ${
                  busy ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {busy === 'upload' ? 'بنرفع…' : picture ? `غيّر ال${noun}` : `ارفع ${noun}`}
                <input type="file" accept="image/*" onChange={handlePick} disabled={Boolean(busy)} className="sr-only" />
              </label>
              {picture && (
                <button
                  type="button"
                  onClick={() => run('remove', () => onSave(null))}
                  disabled={Boolean(busy)}
                  className={`${buttonClass} disabled:opacity-60`}
                >
                  {busy === 'remove' ? 'بنشيل…' : `شيل ال${noun}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
