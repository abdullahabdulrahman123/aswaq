import { useState } from 'react';
import { thumbnail } from '../lib/cloudinary';

/** أول حرف من الاسم (أو الإيميل) — مكان صورة الشخص لحد ما يرفع واحدة */
export function personInitial(name: string | undefined, email: string | undefined): string {
  const source = (name ?? email ?? '').trim();
  return source ? Array.from(source)[0].toUpperCase() : '';
}

interface Props {
  picture?: string | null;
  /** اللي بيظهر من غير صورة: أول حرف للشخص، والاختصار للنشاط */
  fallback: string;
  /** الشخص دايرة والنشاط مربع بحواف — الشكل لوحده بيفرّق بينهم */
  kind: 'person' | 'business';
  /** بالبكسل */
  size: number;
  /**
   * solid = أنا (على يمين الناڤبار)، soft = الطرف التاني (البائع على الشمال)،
   * عشان الاتنين ميتلخبطوش في بعض وهم من غير صور.
   */
  tone?: 'solid' | 'soft';
}

/** الحروف بتصغر كل ما تكتر عشان الاختصار يفضل جوه الشكل */
const LETTER_SCALE = [0.45, 0.45, 0.38, 0.32, 0.27];

export function Avatar({ picture, fallback, kind, size, tone = 'solid' }: Props) {
  // الرابط اللي فشل تحميله — لو الصورة اتغيّرت نجرّب الجديدة
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = Boolean(picture) && broken !== picture;

  const letters = Array.from(fallback.trim()).slice(0, 4);
  const colors =
    tone === 'soft'
      ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-300 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/40'
      : kind === 'person'
        ? 'bg-brand-500 text-white'
        : 'bg-brand-700 text-white dark:bg-brand-600';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden font-display font-bold leading-none ${
        kind === 'person' ? 'rounded-full' : 'rounded-[28%]'
      } ${showImage ? 'bg-stone-100 dark:bg-white/10' : colors}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * LETTER_SCALE[letters.length])),
      }}
    >
      {showImage ? (
        <img
          src={thumbnail(picture!, size)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(picture!)}
        />
      ) : (
        letters.join('')
      )}
    </span>
  );
}
