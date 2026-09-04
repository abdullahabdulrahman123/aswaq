/**
 * كتالوج تجريبي (mock) — لا يوجد خادم بعد.
 *
 * أسواق منصة بيع: الشركات هي اللي بتحدد منتجاتها، والمنصة مش محصورة في
 * مجال واحد. فالتصنيفات هنا عامة، وكل شركة بتبيع في التصنيفات اللي تخصها.
 *
 * البنية على ٣ مستويات:
 *   Product  = الصنف نفسه — من غير سعر ولا مخزون
 *   Variant  = العبوة/الحجم اللي الزبون يختار منه
 *   Offer    = عرض شركة معيّنة على حجم معيّن (السعر والمخزون والشرائح هنا)
 *
 * كده الصنف يظهر مرة واحدة حتى لو كذا شركة بتبيعه، والزبون يختار من مين.
 *
 * كل المبالغ بالقروش (integer) — الكسور العشرية بتعمل فروق بتتراكم مع العمولات.
 */

export type CategoryId =
  | 'grocery'
  | 'beverages'
  | 'cleaning'
  | 'kitchen'
  | 'stationery'
  | 'packaging';

export interface Category {
  id: CategoryId;
  name: string;
  hint: string;
}

export interface Brand {
  id: string;
  name: string;
}

/** الشركة البائعة */
export interface Vendor {
  id: string;
  name: string;
  /** 'own' = مخازن أسواق نفسها، 'partner' = شركة شريكة بتشحن بنفسها */
  kind: 'own' | 'partner';
  city: string;
  rating: number;
  /** عدد الطلبات المكتملة — أساس ترتيب الشركات */
  sales: number;
  verified: boolean;
  since: number;
  tagline: string;
}

/** شريحة كمية: من كذا قطعة، السعر للقطعة كذا (بالقروش) */
export interface PriceTier {
  minQty: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  category: CategoryId;
  description: string;
}

export interface Variant {
  id: string;
  productId: string;
  /** وصف العبوة كما تحدده الشركة */
  label: string;
}

export interface Offer {
  id: string;
  variantId: string;
  vendorId: string;
  /** سعر البيع للأفراد بالقروش */
  price: number;
  /** أسعار الكميات — تظهر لحسابات الشركات */
  tiers: PriceTier[];
  stock: number;
  sold: number;
  rating: number;
  reviews: number;
}

// ————————————————————————————————————————————————————————————
// البيانات
// ————————————————————————————————————————————————————————————

export const categories: Category[] = [
  { id: 'grocery', name: 'بقالة ومواد غذائية', hint: 'معلبات، حبوب، زيوت' },
  { id: 'beverages', name: 'مشروبات', hint: 'مياه، عصائر، شاي وقهوة' },
  { id: 'cleaning', name: 'منظفات', hint: 'للبيت والمنشآت' },
  { id: 'kitchen', name: 'أدوات مطبخ', hint: 'أواني وأدوات' },
  { id: 'stationery', name: 'قرطاسية', hint: 'مكتبية وورقية' },
  { id: 'packaging', name: 'تغليف', hint: 'أكياس وكراتين وعبوات' },
];

export const brands: Brand[] = [
  { id: 'alnile', name: 'النيل' },
  { id: 'almasa', name: 'الماسة' },
  { id: 'royal', name: 'رويال' },
  { id: 'zaman', name: 'زمان' },
  { id: 'elite', name: 'إيليت' },
];

export const vendors: Vendor[] = [
  { id: 'aswaq', name: 'مخازن أسواق', kind: 'own', city: 'القاهرة', rating: 4.8, sales: 5240, verified: true, since: 2024, tagline: 'مخازننا الخاصة — شحن أسرع وإرجاع أسهل' },
  { id: 'nile-foods', name: 'النيل للأغذية', kind: 'partner', city: 'الجيزة', rating: 4.5, sales: 3110, verified: true, since: 2019, tagline: 'موزّع معتمد للمواد الغذائية والمشروبات' },
  { id: 'delta-trade', name: 'الدلتا للتجارة', kind: 'partner', city: 'طنطا', rating: 4.2, sales: 1980, verified: true, since: 2016, tagline: 'توزيع منظفات ومستلزمات للمنشآت' },
  { id: 'saeed-co', name: 'شركة الصعيد', kind: 'partner', city: 'أسيوط', rating: 4.6, sales: 1420, verified: true, since: 2021, tagline: 'أدوات مطبخ وتغليف بأسعار الجملة' },
  { id: 'bahr-dist', name: 'البحر للتوزيع', kind: 'partner', city: 'الإسكندرية', rating: 4.4, sales: 960, verified: true, since: 2022, tagline: 'قرطاسية ومستلزمات مكتبية' },
  { id: 'masr-supply', name: 'مصر للتوريدات', kind: 'partner', city: 'القاهرة', rating: 4.0, sales: 430, verified: false, since: 2025, tagline: 'شركة جديدة على أسواق' },
];

export const products: Product[] = [
  { id: 'pr-01', name: 'زيت عباد شمس', brandId: 'alnile', category: 'grocery', description: 'زيت طهي نقي معبأ، مناسب للاستخدام المنزلي والتجاري.' },
  { id: 'pr-02', name: 'أرز أبيض فاخر', brandId: 'almasa', category: 'grocery', description: 'حبة طويلة منقّاة، معبأة في أكياس محكمة.' },
  { id: 'pr-03', name: 'مياه معدنية', brandId: 'royal', category: 'beverages', description: 'مياه طبيعية معبأة، متوفرة بعبوات مختلفة.' },
  { id: 'pr-04', name: 'شاي أسود ناعم', brandId: 'zaman', category: 'beverages', description: 'خلطة شاي أسود بنكهة قوية.' },
  { id: 'pr-05', name: 'سائل تنظيف أرضيات', brandId: 'elite', category: 'cleaning', description: 'منظف مركّز برائحة منعشة، يكفي مساحات كبيرة.' },
  { id: 'pr-06', name: 'صابون أطباق', brandId: 'elite', category: 'cleaning', description: 'مزيل دهون فعّال، لطيف على اليد.' },
  { id: 'pr-07', name: 'طقم حلل ستانلس', brandId: 'royal', category: 'kitchen', description: 'ستانلس ستيل بقاعدة سميكة، مناسب لكل مصادر الحرارة.' },
  { id: 'pr-08', name: 'أكواب زجاج', brandId: 'almasa', category: 'kitchen', description: 'زجاج شفاف مقاوم، مناسب للمطاعم والكافيهات.' },
  { id: 'pr-09', name: 'ورق طباعة A4', brandId: 'elite', category: 'stationery', description: 'ورق أبيض 80 جرام، مناسب لكل الطابعات.' },
  { id: 'pr-10', name: 'أقلام جاف', brandId: 'zaman', category: 'stationery', description: 'كتابة سلسة وحبر ثابت.' },
  { id: 'pr-11', name: 'أكياس تغليف', brandId: 'alnile', category: 'packaging', description: 'أكياس متينة بأحجام مختلفة للتعبئة والتغليف.' },
  { id: 'pr-12', name: 'كراتين شحن', brandId: 'almasa', category: 'packaging', description: 'كرتون مضلّع مقوّى يتحمل النقل.' },
];

export const variants: Variant[] = [
  { id: 'v-01a', productId: 'pr-01', label: 'عبوة 1 لتر' },
  { id: 'v-01b', productId: 'pr-01', label: 'عبوة 5 لتر' },
  { id: 'v-02a', productId: 'pr-02', label: 'كيس 1 كجم' },
  { id: 'v-02b', productId: 'pr-02', label: 'كيس 5 كجم' },
  { id: 'v-03a', productId: 'pr-03', label: 'شد 12 زجاجة' },
  { id: 'v-04a', productId: 'pr-04', label: 'علبة 250 جم' },
  { id: 'v-05a', productId: 'pr-05', label: 'عبوة 2 لتر' },
  { id: 'v-05b', productId: 'pr-05', label: 'جالون 5 لتر' },
  { id: 'v-06a', productId: 'pr-06', label: 'عبوة 1 لتر' },
  { id: 'v-07a', productId: 'pr-07', label: 'طقم 7 قطع' },
  { id: 'v-08a', productId: 'pr-08', label: 'طقم 6 أكواب' },
  { id: 'v-09a', productId: 'pr-09', label: 'رزمة 500 ورقة' },
  { id: 'v-09b', productId: 'pr-09', label: 'كرتونة 5 رزم' },
  { id: 'v-10a', productId: 'pr-10', label: 'علبة 12 قلم' },
  { id: 'v-11a', productId: 'pr-11', label: 'رول 100 كيس' },
  { id: 'v-12a', productId: 'pr-12', label: 'حزمة 20 كرتونة' },
];

/** مختصر لبناء العرض — الأسعار بالجنيه هنا وبتتحول لقروش أوتوماتيك */
function offer(
  id: string, variantId: string, vendorId: string, priceEGP: number,
  stock: number, sold: number, rating: number, reviews: number,
  tiers: [number, number][],
): Offer {
  return {
    id, variantId, vendorId,
    price: Math.round(priceEGP * 100),
    tiers: tiers.map(([minQty, p]) => ({ minQty, price: Math.round(p * 100) })),
    stock, sold, rating, reviews,
  };
}

export const offers: Offer[] = [
  // مؤقتاً: كل منتج من شركة واحدة. بنية Offer بتسمح بأكتر من شركة على نفس
  // المنتج، وهنرجّعها لما تتحدد أولويات عرض المقارنة.
  offer('of-01', 'v-01a', 'aswaq', 89, 640, 1840, 4.7, 213, [[12, 84], [48, 79], [120, 75]]),
  offer('of-02', 'v-01b', 'aswaq', 430, 220, 430, 4.6, 95, [[6, 405], [24, 385]]),
  offer('of-03', 'v-04a', 'aswaq', 62, 520, 690, 4.6, 102, [[12, 58], [48, 54]]),

  offer('of-04', 'v-02a', 'nile-foods', 46.5, 410, 1160, 4.5, 168, [[12, 43], [48, 40]]),
  offer('of-05', 'v-02b', 'nile-foods', 220, 160, 210, 4.4, 38, [[10, 208], [40, 196]]),
  offer('of-06', 'v-03a', 'nile-foods', 78, 95, 1520, 4.4, 261, [[10, 72], [40, 66]]),

  offer('of-07', 'v-05a', 'delta-trade', 55, 0, 480, 4.3, 44, [[12, 51], [48, 47]]),
  offer('of-08', 'v-05b', 'delta-trade', 120, 180, 150, 4.1, 26, [[8, 112], [30, 105]]),
  offer('of-09', 'v-06a', 'delta-trade', 38, 780, 1290, 4.1, 137, [[12, 35], [60, 32]]),

  offer('of-10', 'v-07a', 'saeed-co', 1250, 64, 340, 4.8, 176, [[4, 1180], [12, 1120]]),
  offer('of-11', 'v-08a', 'saeed-co', 165, 187, 570, 4.4, 73, [[6, 155], [24, 145]]),
  offer('of-12', 'v-11a', 'saeed-co', 68, 300, 410, 4.0, 33, [[10, 63], [40, 58]]),

  offer('of-13', 'v-09a', 'bahr-dist', 195, 410, 1480, 4.6, 229, [[5, 185], [20, 176]]),
  offer('of-14', 'v-09b', 'bahr-dist', 920, 120, 320, 4.7, 88, [[3, 880], [10, 845]]),
  offer('of-15', 'v-10a', 'bahr-dist', 45, 520, 640, 4.2, 51, [[10, 42], [40, 39]]),

  offer('of-16', 'v-12a', 'masr-supply', 240, 130, 180, 4.1, 29, [[5, 228], [20, 215]]),
];

/** قواعد تجارية مبدئية — محتاجة تأكيد من العميل */
export const rules = {
  minOrderValue: 30000,
  freeShippingOver: 75000,
  flatShipping: 4500,
};

// ————————————————————————————————————————————————————————————
// دوال مساعدة
// ————————————————————————————————————————————————————————————

export const brandById = (id: string) => brands.find((b) => b.id === id);
export const vendorById = (id: string) => vendors.find((v) => v.id === id);
export const categoryById = (id: CategoryId) => categories.find((c) => c.id === id);
export const productById = (id: string) => products.find((p) => p.id === id);
export const variantById = (id: string) => variants.find((v) => v.id === id);
export const offerById = (id: string) => offers.find((o) => o.id === id);

export const variantsOf = (productId: string) => variants.filter((v) => v.productId === productId);

export const offersForVariant = (variantId: string) => offers.filter((o) => o.variantId === variantId);

export const offersForProduct = (productId: string) => {
  const ids = variantsOf(productId).map((v) => v.id);
  return offers.filter((o) => ids.includes(o.variantId));
};

/** العرض المرشّح: الأرخص المتوفر — مع تفضيل شركة معيّنة لو السلة مقفولة عليها */
export function bestOffer(list: Offer[], preferVendorId?: string): Offer | undefined {
  if (list.length === 0) return undefined;
  const inStock = list.filter((o) => o.stock > 0);
  const pool = inStock.length > 0 ? inStock : list;
  if (preferVendorId) {
    const preferred = pool.filter((o) => o.vendorId === preferVendorId).sort((a, b) => a.price - b.price)[0];
    if (preferred) return preferred;
  }
  return [...pool].sort((a, b) => a.price - b.price)[0];
}

export function productsOfVendor(vendorId: string): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const o of offers.filter((x) => x.vendorId === vendorId)) {
    const v = variantById(o.variantId);
    const p = v ? productById(v.productId) : undefined;
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export const vendorOffers = (vendorId: string) => offers.filter((o) => o.vendorId === vendorId);

export const topVendors = () => [...vendors].sort((a, b) => b.sales - a.sales);

/**
 * حروف مختصرة تنفع كشعار مؤقت لحد ما الشركات ترفع لوجوهات.
 * لازم نشيل "شركة/مخازن" و"ال" التعريف، وإلا كل الشركات هتطلع "ال".
 */
export function vendorInitials(name: string): string {
  const cleaned = name.replace(/^(شركة|مخازن|مؤسسة|مجموعة)\s+/, '').trim();
  const words = cleaned.split(/\s+/).map((w) => w.replace(/^(لل|ال|و)/, '')).filter(Boolean);
  if (words.length >= 2) return words[0].charAt(0) + words[1].charAt(0);
  return (words[0] ?? cleaned).slice(0, 2);
}

export const egp = (piastres: number) => {
  const value = piastres / 100;
  const hasFraction = piastres % 100 !== 0;
  return `${value.toLocaleString('en-EG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} ج.م`;
};
