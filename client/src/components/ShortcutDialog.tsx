import { useEffect, useRef, type ReactNode } from 'react';
import { DialogCloseButton, useBackdropClose } from './DialogClose';
import { isIOS, ShareIcon } from './InstallPrompt';

/**
 * خطوات الاختصار (مكالمة ٥ أكتوبر: «زرارين في المنيو يخلوك تضيف التطبيق كاختصار
 * للشاشة الرئيسية وكاختصار متصفح»).
 *
 * المتصفحات مبتسمحش لأي موقع يحط نفسه في المفضلة، ولا يثبّت نفسه على الآيفون —
 * فالنافذة دي بتقول الخطوات على الجهاز اللي فاتح بيه. على أندرويد والكمبيوتر
 * «أضف للشاشة الرئيسية» بيفتح نافذة التثبيت على طول لو المتصفح جاهز (IdentityMenu).
 */
export type ShortcutKind = 'home' | 'bookmark';

type Device = 'ios' | 'android' | 'desktop';

function deviceOf(): Device {
  if (isIOS()) return 'ios';
  return /Android/i.test(navigator.userAgent) ? 'android' : 'desktop';
}

const isMac = () => /Macintosh|Mac OS X/.test(navigator.userAgent);

/** النجمة والنقط التلاتة زي ما هي في المتصفح */
const Key = ({ children }: { children: ReactNode }) => (
  <kbd className="mx-0.5 inline-block rounded-md border border-stone-300 bg-stone-50 px-1.5 font-sans text-xs font-semibold not-italic dark:border-white/20 dark:bg-white/10">{children}</kbd>
);

function steps(kind: ShortcutKind, device: Device): ReactNode {
  if (kind === 'home') {
    if (device === 'ios')
      return (
        <>
          دوس على زرار المشاركة <ShareIcon /> في المتصفح، وبعدين اختار «إضافة إلى الشاشة الرئيسية».
        </>
      );
    if (device === 'android')
      return (
        <>
          من منيو المتصفح <Key>⋮</Key> فوق، اختار «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».
        </>
      );
    return (
      <>
        من منيو المتصفح <Key>⋮</Key> فوق، اختار «تثبيت أسواق» — أو أيقونة التثبيت في آخر شريط العنوان. هيتحط على سطح المكتب ويفتح زي أي برنامج.
      </>
    );
  }
  if (device === 'ios')
    return (
      <>
        دوس على زرار المشاركة <ShareIcon /> في المتصفح، وبعدين اختار «إضافة إشارة مرجعية».
      </>
    );
  if (device === 'android')
    return (
      <>
        من منيو المتصفح <Key>⋮</Key> فوق، دوس على النجمة <Key>☆</Key>.
      </>
    );
  return (
    <>
      دوس <Key>{isMac() ? '⌘' : 'Ctrl'}</Key>+<Key>D</Key>، أو النجمة <Key>☆</Key> في آخر شريط العنوان.
    </>
  );
}

export function ShortcutDialog({ kind, onClose }: { kind: ShortcutKind; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropClose = useBackdropClose();
  const title = kind === 'home' ? 'أضف أسواق للشاشة الرئيسية' : 'اختصار أسواق في المتصفح';

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      {...backdropClose}
      onClose={onClose}
      aria-label={title}
      data-shortcut={kind}
      style={{ width: 'min(24rem, 94vw)' }}
      className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
    >
      <div className="p-5">
        <div className="flex items-center gap-3 pe-8">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
          <h2 className="font-display text-base font-bold">{title}</h2>
        </div>
        <p data-steps className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {steps(kind, deviceOf())}
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            تمام
          </button>
        </div>
      </div>
      <DialogCloseButton />
    </dialog>
  );
}
