import { useId } from 'react';
import type { ReactElement } from 'react';
import type { CategoryId } from '../data/catalog';

/**
 * رسم توضيحي لكل تصنيف — SVG بالكود بدل صور خارجية.
 * مؤقت لحد ما الشركات ترفع صور منتجاتها الحقيقية.
 *
 * لون الخطوط currentColor عشان يتبدل مع الثيم، والحشو ذهبي ثابت
 * لأنه بيشتغل على الخلفية الفاتحة والداكنة.
 */

const FILL = '#EDC470';
const FILL_2 = '#F4DCA4';
const LINE = 'currentColor';

/** زجاجة/عبوة سائل */
function Bottle() {
  return (
    <g transform="translate(100 100)">
      <rect x="-14" y="-72" width="28" height="20" rx="4" fill={FILL_2} stroke={LINE} strokeWidth="3.5" />
      <path d="M -13 -52 C -13 -40, -34 -34, -34 -14 L -34 56 a 10 10 0 0 0 10 10 l 48 0 a 10 10 0 0 0 10 -10 L 34 -14 C 34 -34, 13 -40, 13 -52 Z"
        fill={FILL} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="-24" y="0" width="48" height="30" rx="3" fill={FILL_2} stroke={LINE} strokeWidth="3" />
      <path d="M -14 12 L 14 12" stroke={LINE} strokeWidth="2.5" opacity="0.55" />
      <path d="M -14 22 L 6 22" stroke={LINE} strokeWidth="2.5" opacity="0.35" />
    </g>
  );
}

/** كيس/شكارة */
function Sack() {
  return (
    <g transform="translate(100 100)">
      <path d="M -44 -46 q 44 -18 88 0 l 8 88 a 10 10 0 0 1 -10 10 l -84 0 a 10 10 0 0 1 -10 -10 Z"
        fill={FILL} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M -44 -46 q 44 22 88 0" fill="none" stroke={LINE} strokeWidth="3" opacity="0.6" />
      <rect x="-26" y="-6" width="52" height="34" rx="4" fill={FILL_2} stroke={LINE} strokeWidth="3" />
      <path d="M -16 6 L 16 6" stroke={LINE} strokeWidth="2.5" opacity="0.5" />
      <path d="M -16 17 L 4 17" stroke={LINE} strokeWidth="2.5" opacity="0.3" />
    </g>
  );
}

/** كرتونة */
function Box({ uid }: { uid: string }) {
  const clip = `box-${uid}`;
  return (
    <g transform="translate(100 100)">
      <defs>
        <clipPath id={clip}><path d="M -58 -30 L 0 -58 L 58 -30 L 58 46 L 0 74 L -58 46 Z" /></clipPath>
      </defs>
      <path d="M -58 -30 L 0 -58 L 58 -30 L 0 -2 Z" fill={FILL_2} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M -58 -30 L 0 -2 L 0 74 L -58 46 Z" fill={FILL} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M 58 -30 L 0 -2 L 0 74 L 58 46 Z" fill={FILL} opacity="0.75" stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <path d="M -30 -16 L -30 60" stroke={LINE} strokeWidth="2.5" opacity="0.35" />
      </g>
    </g>
  );
}

/** حلة/إناء */
function Pot() {
  return (
    <g transform="translate(100 100)">
      <path d="M -46 -22 L -38 46 a 12 12 0 0 0 12 11 l 52 0 a 12 12 0 0 0 12 -11 l 8 -68 Z"
        fill={FILL} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="0" cy="-24" rx="52" ry="12" fill={FILL_2} stroke={LINE} strokeWidth="3.5" />
      <path d="M -52 -30 q -16 -2 -16 -14" fill="none" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M 52 -30 q 16 -2 16 -14" fill="none" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <rect x="-8" y="-42" width="16" height="8" rx="3" fill={FILL_2} stroke={LINE} strokeWidth="3" />
    </g>
  );
}

/** رزمة ورق */
function Paper() {
  const sheet = (y: number, fill: string) => (
    <rect key={y} x="-42" y={y} width="84" height="26" rx="3" fill={fill} stroke={LINE} strokeWidth="3" />
  );
  return (
    <g transform="translate(100 100)">
      {sheet(-56, FILL_2)}
      {sheet(-26, FILL)}
      {sheet(4, FILL_2)}
      {sheet(34, FILL)}
      <path d="M -28 -46 L 20 -46" stroke={LINE} strokeWidth="2.5" opacity="0.45" />
      <path d="M -28 14 L 20 14" stroke={LINE} strokeWidth="2.5" opacity="0.45" />
    </g>
  );
}

/** أكياس بلاستيك */
function Bags() {
  const bag = (x: number, y: number, s: number, fill: string) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -26 -18 L 26 -18 L 21 44 a 8 8 0 0 1 -8 7 l -26 0 a 8 8 0 0 1 -8 -7 Z"
        fill={fill} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M -14 -18 q 0 -18 14 -18 t 14 18" fill="none" stroke={LINE} strokeWidth="3.5" />
    </g>
  );
  return (
    <g>
      {bag(72, 76, 0.82, FILL)}
      {bag(128, 108, 0.95, FILL_2)}
    </g>
  );
}

const RENDERERS: Record<CategoryId, (props: { uid: string }) => ReactElement> = {
  grocery: Sack,
  beverages: Bottle,
  cleaning: Bottle,
  kitchen: Pot,
  stationery: Paper,
  packaging: Box,
};

/** بعض التصنيفات ليها رسمة بديلة أوضح */
const OVERRIDES: Partial<Record<CategoryId, (props: { uid: string }) => ReactElement>> = {
  packaging: Bags,
};

export function ProductArt({
  category,
  className = '',
  variant = 'default',
}: {
  category: CategoryId;
  className?: string;
  /** 'alt' بيستخدم الرسمة البديلة لو التصنيف ليه واحدة */
  variant?: 'default' | 'alt';
}) {
  const Render = (variant === 'alt' ? OVERRIDES[category] : undefined) ?? RENDERERS[category];
  // معرّف فريد لكل نسخة — clipPath محتاج id مميز لو أكتر من رسمة في الصفحة
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 200 200"
      className={`text-brand-800 dark:text-brand-200 ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      <Render uid={uid} />
    </svg>
  );
}
