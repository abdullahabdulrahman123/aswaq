import { useId } from 'react';
import type { ReactElement } from 'react';
import type { ShapeId } from '../data/catalog';

/**
 * رسم توضيحي لكل شكل معكرونة — SVG بالكود بدل صور خارجية.
 * في النسخة الحقيقية هتتبدل بصور المنتج اللي البائع يرفعها.
 *
 * لون الخطوط = currentColor عشان يتبدل مع الثيم الفاتح/الداكن،
 * والحشو ذهبي ثابت لأنه بيشتغل على الخلفيتين.
 */

const FILL = '#EDC470';
const FILL_2 = '#F4DCA4';
const LINE = 'currentColor';

function Spaghetti() {
  return (
    <g fill="none" stroke={LINE} strokeWidth="5" strokeLinecap="round" opacity="0.9">
      {[52, 74, 96, 118, 140].map((x, i) => (
        <path
          key={x}
          d={`M ${x} 34 C ${x + (i % 2 ? 10 : -10)} 74, ${x + (i % 2 ? -10 : 10)} 118, ${x} 166`}
          stroke={i % 2 ? FILL : LINE}
          strokeWidth={i % 2 ? 7 : 5}
        />
      ))}
    </g>
  );
}

function Penne() {
  return (
    <g>
      {[
        { x: 58, y: 62, r: -22 },
        { x: 112, y: 96, r: 16 },
        { x: 74, y: 136, r: -8 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
          <path
            d="M -10 -34 L 34 -20 L 34 20 L -10 34 Z"
            fill={i === 1 ? FILL_2 : FILL}
            stroke={LINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M -10 -34 L -10 34" stroke={LINE} strokeWidth="3" fill="none" />
          <ellipse cx="34" cy="0" rx="5" ry="20" fill={LINE} opacity="0.35" stroke={LINE} strokeWidth="3" />
        </g>
      ))}
    </g>
  );
}

function Farfalle() {
  return (
    <g transform="translate(100 100)">
      <path
        d="M -8 0 C -30 -42, -78 -40, -72 -6 C -76 30, -30 40, -8 0 Z"
        fill={FILL}
        stroke={LINE}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M 8 0 C 30 -42, 78 -40, 72 -6 C 76 30, 30 40, 8 0 Z"
        fill={FILL}
        stroke={LINE}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <rect x="-11" y="-17" width="22" height="34" rx="6" fill={FILL_2} stroke={LINE} strokeWidth="3.5" />
      {[-6, 0, 6].map((dx) => (
        <path key={dx} d={`M ${dx} -12 L ${dx} 12`} stroke={LINE} strokeWidth="2" opacity="0.6" />
      ))}
    </g>
  );
}

function Fusilli({ uid }: { uid: string }) {
  const clip = `fusilli-clip-${uid}`;
  const body = { x: -27, y: -72, width: 54, height: 144, rx: 27 };
  return (
    <g transform="translate(100 100)">
      <defs>
        <clipPath id={clip}>
          <rect {...body} />
        </clipPath>
      </defs>
      <rect {...body} fill={FILL} />
      {/* الأخاديد الحلزونية — مقصوصة على جسم المكرونة فتقرأ كلولب */}
      <g clipPath={`url(#${clip})`} fill="none" stroke={LINE} strokeWidth="9" strokeLinecap="round" opacity="0.45">
        {[-70, -46, -22, 2, 26, 50].map((y) => (
          <path key={y} d={`M -32 ${y + 20} Q 0 ${y - 4}, 32 ${y + 2}`} />
        ))}
      </g>
      <rect {...body} fill="none" stroke={LINE} strokeWidth="3.5" />
    </g>
  );
}

function Lasagna() {
  const sheet = (y: number, fill: string) => (
    <path
      key={y}
      d={`M 38 ${y} q 10 -8 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 24 0 l 0 26 q -12 8 -24 0 t -20 0 t -20 0 t -20 0 t -20 0 t -20 0 Z`}
      fill={fill}
      stroke={LINE}
      strokeWidth="3"
      strokeLinejoin="round"
    />
  );
  return (
    <g>
      {sheet(56, FILL)}
      {sheet(96, FILL_2)}
      {sheet(136, FILL)}
    </g>
  );
}

function Shells() {
  const shell = (x: number, y: number, s: number, fill: string) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M 0 -30 C 34 -26, 40 14, 0 32 C -40 14, -34 -26, 0 -30 Z"
        fill={fill}
        stroke={LINE}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {[-20, -10, 0, 10, 20].map((a) => (
        <path key={a} d={`M ${a * 0.5} -24 L ${a} 26`} stroke={LINE} strokeWidth="2" fill="none" opacity="0.55" />
      ))}
      {/* فتحة الصدفة */}
      <path
        d="M -21 -20 C -9 -32, 9 -32, 21 -20 C 9 -13, -9 -13, -21 -20 Z"
        fill={LINE}
        opacity="0.3"
        stroke={LINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
  return (
    <g>
      {shell(70, 72, 0.9, FILL)}
      {shell(130, 108, 1, FILL_2)}
      {shell(72, 142, 0.75, FILL)}
    </g>
  );
}

function Elbow() {
  const tube = (x: number, y: number, r: number, s: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M -34 26 A 40 40 0 0 1 34 26" fill="none" stroke={FILL} strokeWidth="26" strokeLinecap="round" />
      <path d="M -34 26 A 40 40 0 0 1 34 26" fill="none" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" opacity="0.35" />
      <circle cx="-34" cy="26" r="6" fill={LINE} opacity="0.35" stroke={LINE} strokeWidth="3" />
      <circle cx="34" cy="26" r="6" fill={LINE} opacity="0.35" stroke={LINE} strokeWidth="3" />
    </g>
  );
  return (
    <g>
      {tube(78, 66, -14, 0.85)}
      {tube(126, 118, 165, 0.95)}
    </g>
  );
}

function Orzo() {
  const seeds = [
    [62, 60, -20], [104, 52, 34], [142, 74, -8], [58, 104, 12],
    [100, 96, -38], [140, 118, 22], [70, 142, -16], [112, 148, 40],
  ];
  return (
    <g>
      {seeds.map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="19"
          ry="9"
          transform={`rotate(${r} ${x} ${y})`}
          fill={i % 3 === 0 ? FILL_2 : FILL}
          stroke={LINE}
          strokeWidth="3"
        />
      ))}
    </g>
  );
}

const RENDERERS: Record<ShapeId, (props: { uid: string }) => ReactElement> = {
  spaghetti: Spaghetti,
  penne: Penne,
  farfalle: Farfalle,
  fusilli: Fusilli,
  lasagna: Lasagna,
  shells: Shells,
  elbow: Elbow,
  orzo: Orzo,
};

export function PastaShape({ shape, className = '' }: { shape: ShapeId; className?: string }) {
  const Render = RENDERERS[shape];
  // معرّف فريد لكل نسخة — أكتر من رسمة ممكن تظهر في نفس الصفحة وclipPath محتاج id مميز
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
