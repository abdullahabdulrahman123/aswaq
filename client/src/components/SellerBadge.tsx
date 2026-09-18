import { Link } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { Avatar } from './Avatar';

/**
 * «الطرف التاني» على شمال الناڤبار: الشركة اللي بتشتري منها، قصاد صورتك على
 * اليمين. بتظهر جوه صفحة الشركة وصفحات منتجاتها بس، والدوسة عليها بترجّعك
 * لصفحة الشركة.
 */
export function SellerBadge() {
  const seller = useSeller();
  if (!seller) return null;

  return (
    <Link
      to={seller.href}
      aria-label={`البائع: ${seller.name}`}
      title={seller.name}
      className="rounded-xl p-0.5 transition hover:bg-stone-100 dark:hover:bg-white/10"
    >
      <Avatar kind="business" tone="soft" picture={seller.picture} fallback={seller.initials} size={34} />
    </Link>
  );
}
