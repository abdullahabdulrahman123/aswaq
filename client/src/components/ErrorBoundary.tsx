import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/errorReport';

/**
 * صفحة «حصلت مشكلة» (فحص ٦ أكتوبر): لو صفحة وقعت وهي بتترسم، بدل الشاشة البيضا
 * رسالة وزرارين — جرّب تاني أو الرئيسية — والخطأ بيتبعت للسيرفر يتسجّل.
 *
 * resetKey: اللينك اتغيّر = صفحة تانية، فبتترسم من جديد (الناڤبار فاضل شغال فوق).
 * اللي فوق كل حاجة (main.tsx) من غيره: لو اللي وقع هو الناڤبار أو الـproviders.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    return this.state.error ? <ErrorPage /> : this.props.children;
  }
}

/** لينكات عادية مش router: الصفحة اللي فوق كل حاجة ممكن تبقى برّه الـrouter */
function ErrorPage() {
  return (
    <section role="alert" data-error-page className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        !
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold">حصلت مشكلة</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        الصفحة دي وقعت، واتسجّل اللي حصل عشان نصلّحه. جرّب تاني، ولو فضلت كده ارجع للرئيسية.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          جرّب تاني
        </button>
        <a
          href={import.meta.env.BASE_URL}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:border-gray-400 dark:border-white/15"
        >
          الرئيسية
        </a>
      </div>
    </section>
  );
}
