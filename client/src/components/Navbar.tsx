import { Link } from 'react-router-dom';
import { BuyerChip } from './BuyerChip';
import { BuyCartButton } from './CartButton';
import { IdentityMenu } from './IdentityMenu';
import { SellerBadge } from './SellerBadge';

/**
 * طرفين قصاد بعض زي أي عملية بيع وشرا، بطلب العميل:
 *   يمين: أنا — صورتي أو صورة النشاط اللي بتعامل بيه، وكل حاجة في المنيو بتاعتها
 *   شمال: البائع اللي بشتري منه — جوه صفحته وصفحات منتجاته بس، وجنبه «طلباتي»
 * وفي «مبيعات» اسم المشتري وتحته الإجمالي (مكالمة ٣٠ سبتمبر) — مفيش سلة بيع.
 */
export function Navbar() {
  return (
    // z-[45]: فوق إعلان التثبيت (z-40) عشان المنيو المفتوحة متستخبّاش وراه، وتحت نافذة تبديل السلة (z-50)
    <header className="sticky top-0 z-[45] print:hidden border-b border-stone-200 bg-surface-light/95 backdrop-blur dark:border-white/10 dark:bg-surface-dark/95">
      {/* مكالمة ٥ أكتوبر: «النافبار واخدة طول كتير من الشاشة» — أقصر على الموبايل، واللوجو أصغر */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1 sm:py-2">
        <div className="flex items-center gap-2">
          <IdentityMenu />
          <Link to="/" className="flex items-baseline gap-1.5 font-display text-xl font-bold text-brand-700 dark:text-brand-400 sm:text-2xl">
            أسواق
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          {/* «طلباتي» — وجوه أوردر عدد أصنافه والإجمالي */}
          <BuyCartButton />

          <BuyerChip />

          <SellerBadge />
        </div>
      </nav>
    </header>
  );
}
