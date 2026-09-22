import { Link } from 'react-router-dom';
import { CartButton } from './CartButton';
import { IdentityMenu } from './IdentityMenu';
import { SellerBadge } from './SellerBadge';

/**
 * طرفين قصاد بعض زي أي عملية بيع وشرا، بطلب العميل:
 *   يمين: أنا — صورتي أو صورة النشاط اللي بتعامل بيه، وكل حاجة في المنيو بتاعتها
 *   شمال: البائع اللي بشتري منه — جوه صفحته وصفحات منتجاته بس، وجنبه السلة
 */
export function Navbar() {
  return (
    // z-[45]: فوق إعلان التثبيت (z-40) عشان المنيو المفتوحة متستخبّاش وراه، وتحت نافذة تبديل السلة (z-50)
    <header className="sticky top-0 z-[45] border-b border-stone-200 bg-surface-light/95 backdrop-blur dark:border-white/10 dark:bg-surface-dark/95">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <IdentityMenu />
          <Link to="/" className="flex items-baseline gap-1.5 font-display text-2xl font-bold text-brand-700 dark:text-brand-400">
            أسواق
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* السلة وتحتها عدد الأصناف والإجمالي — صفحتها لسه «قريباً» */}
          <CartButton />

          <SellerBadge />
        </div>
      </nav>
    </header>
  );
}
