/**
 * كتالوج تجريبي (mock) — لا يوجد خادم بعد.
 *
 * البنية على ٣ مستويات وده مقصود:
 *   Product  = الصنف نفسه (سباجيتي الملكة) — من غير سعر ولا مخزون
 *   Variant  = الحجم/العبوة (400 جم / 1 كجم) — الزبون يختار منها
 *   Offer    = عرض شركة معيّنة على حجم معيّن (السعر والمخزون والشرائح هنا)
 *
 * كده الصنف الواحد يظهر مرة واحدة في الموقع حتى لو ٣ شركات بتبيعه،
 * والزبون يختار يشتري من مين. ده أساس فكرة السوق.
 *
 * كل المبالغ محفوظة بالقروش (integer) مش بالجنيه —
 * الكسور العشرية في الكود بتعمل فروق قروش بتتراكم مع العمولات.
 */

export type ShapeId =
  | 'spaghetti'
  | 'penne'
  | 'farfalle'
  | 'fusilli'
  | 'lasagna'
  | 'shells'
  | 'elbow'
  | 'orzo';

export interface Shape {
  id: ShapeId;
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
  /** عدد الطلبات المكتملة — أساس ترتيب "الشركات الأكتر مبيعاً" */
  sales: number;
  /** موثّقة: راجعنا أوراقها واعتمدناها */
  verified: boolean;
  since: number;
  tagline: string;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  shape: ShapeId;
  description: string;
}

export interface Variant {
  id: string;
  productId: string;
  /** الوزن بالجرام */
  weight: number;
}

/** شريحة جملة: من كذا قطعة، السعر للقطعة كذا (بالقروش) */
export interface PriceTier {
  minQty: number;
  price: number;
}

/** عرض شركة على حجم معيّن */
export interface Offer {
  id: string;
  variantId: string;
  vendorId: string;
  /** سعر التجزئة بالقروش */
  price: number;
  /** سعر قبل الخصم بالقروش — للعرض فقط */
  oldPrice?: number;
  tiers: PriceTier[];
  stock: number;
  /** عدد مرات الشراء — أساس ترتيب "الأكثر مبيعاً" */
  sold: number;
  rating: number;
  reviews: number;
  badges?: string[];
}

// ————————————————————————————————————————————————————————————
// البيانات
// ————————————————————————————————————————————————————————————

export const shapes: Shape[] = [
  { id: 'spaghetti', name: 'سباجيتي', hint: 'خيوط طويلة رفيعة' },
  { id: 'penne', name: 'بيني (قلم)', hint: 'أنابيب مائلة الأطراف' },
  { id: 'farfalle', name: 'فارفالليه (فيونكة)', hint: 'شكل الفراشة' },
  { id: 'fusilli', name: 'فوسيلي (لولبي)', hint: 'حلزوني يمسك الصوص' },
  { id: 'lasagna', name: 'لازانيا', hint: 'شرائح عريضة للفرن' },
  { id: 'shells', name: 'صدف', hint: 'أصداف مجوّفة للحشو' },
  { id: 'elbow', name: 'كوع', hint: 'أنابيب قصيرة منحنية' },
  { id: 'orzo', name: 'لسان عصفور', hint: 'حبات صغيرة للشوربة' },
];

export const brands: Brand[] = [
  { id: 'malika', name: 'الملكة' },
  { id: 'regina', name: 'ريجينا' },
  { id: 'italiano', name: 'إيتاليانو' },
  { id: 'barilla', name: 'باريلا' },
  { id: 'zaman', name: 'زمان' },
];

export const vendors: Vendor[] = [
  {
    id: 'aswaq',
    name: 'مخازن أسواق',
    kind: 'own',
    city: 'القاهرة',
    rating: 4.8,
    sales: 5240,
    verified: true,
    since: 2024,
    tagline: 'مخازننا الخاصة — شحن أسرع وإرجاع أسهل',
  },
  {
    id: 'nile-foods',
    name: 'النيل للأغذية',
    kind: 'partner',
    city: 'الجيزة',
    rating: 4.5,
    sales: 3110,
    verified: true,
    since: 2019,
    tagline: 'موزّع معتمد للماركات المستوردة',
  },
  {
    id: 'delta-trade',
    name: 'الدلتا للتجارة',
    kind: 'partner',
    city: 'طنطا',
    rating: 4.2,
    sales: 1980,
    verified: true,
    since: 2016,
    tagline: 'جملة وتوزيع لمحافظات الدلتا',
  },
  {
    id: 'saeed-co',
    name: 'شركة الصعيد',
    kind: 'partner',
    city: 'أسيوط',
    rating: 4.6,
    sales: 1420,
    verified: true,
    since: 2021,
    tagline: 'أسعار تنافسية وكميات كبيرة',
  },
  {
    id: 'bahr-dist',
    name: 'البحر للتوزيع',
    kind: 'partner',
    city: 'الإسكندرية',
    rating: 4.4,
    sales: 960,
    verified: true,
    since: 2022,
    tagline: 'تغطية الإسكندرية والساحل',
  },
  {
    id: 'masr-pasta',
    name: 'مصر للمعكرونة',
    kind: 'partner',
    city: 'القاهرة',
    rating: 4.0,
    sales: 430,
    verified: false,
    since: 2025,
    tagline: 'شركة جديدة على أسواق',
  },
];

export const products: Product[] = [
  { id: 'pr-01', name: 'سباجيتي رفيع', brandId: 'malika', shape: 'spaghetti', description: 'خيوط رفيعة تنفع لكل الصوصات، من سميد القمح الصلب.' },
  { id: 'pr-02', name: 'مكرونة قلم بيني', brandId: 'regina', shape: 'penne', description: 'أنابيب مائلة الأطراف تمسك الصوص من جوه وبره.' },
  { id: 'pr-03', name: 'فارفالليه فيونكة', brandId: 'italiano', shape: 'farfalle', description: 'شكل الفراشة — مناسبة للسلطات والأطباق الباردة.' },
  { id: 'pr-04', name: 'فوسيلي لولبي', brandId: 'malika', shape: 'fusilli', description: 'حلزوني بأخاديد عميقة تمسك الصوص التقيل.' },
  { id: 'pr-05', name: 'شرائح لازانيا', brandId: 'barilla', shape: 'lasagna', description: 'شرائح عريضة جاهزة للفرن من غير سلق مسبق.' },
  { id: 'pr-06', name: 'مكرونة صدف', brandId: 'zaman', shape: 'shells', description: 'أصداف مجوّفة تنفع للحشو أو مع الصوص الأبيض.' },
  { id: 'pr-07', name: 'مكرونة كوع', brandId: 'regina', shape: 'elbow', description: 'الأكثر استخداماً في المكرونة بالبشاميل.' },
  { id: 'pr-08', name: 'لسان عصفور', brandId: 'malika', shape: 'orzo', description: 'حبات صغيرة للشوربة والأرز المعمّر.' },
  { id: 'pr-09', name: 'سباجيتي سميك', brandId: 'italiano', shape: 'spaghetti', description: 'أسمك من العادي — قوام أمتن بعد السلق.' },
  { id: 'pr-10', name: 'بيني ريجاتي مضلّع', brandId: 'barilla', shape: 'penne', description: 'مضلّع من بره، إيطالي مستورد.' },
  { id: 'pr-11', name: 'فوسيلي بالخضار', brandId: 'zaman', shape: 'fusilli', description: 'ملوّن بالسبانخ والطماطم الطبيعية.' },
  { id: 'pr-12', name: 'صدف كبير للحشو', brandId: 'italiano', shape: 'shells', description: 'حجم كبير مخصوص للحشو بالجبنة أو اللحمة.' },
];

export const variants: Variant[] = [
  { id: 'v-01a', productId: 'pr-01', weight: 400 },
  { id: 'v-01b', productId: 'pr-01', weight: 1000 },
  { id: 'v-02a', productId: 'pr-02', weight: 400 },
  { id: 'v-02b', productId: 'pr-02', weight: 800 },
  { id: 'v-03a', productId: 'pr-03', weight: 500 },
  { id: 'v-04a', productId: 'pr-04', weight: 400 },
  { id: 'v-04b', productId: 'pr-04', weight: 1000 },
  { id: 'v-05a', productId: 'pr-05', weight: 500 },
  { id: 'v-06a', productId: 'pr-06', weight: 400 },
  { id: 'v-07a', productId: 'pr-07', weight: 400 },
  { id: 'v-07b', productId: 'pr-07', weight: 1000 },
  { id: 'v-08a', productId: 'pr-08', weight: 350 },
  { id: 'v-09a', productId: 'pr-09', weight: 1000 },
  { id: 'v-10a', productId: 'pr-10', weight: 500 },
  { id: 'v-11a', productId: 'pr-11', weight: 400 },
  { id: 'v-12a', productId: 'pr-12', weight: 500 },
];

/** مختصر لبناء العرض — الأسعار بالجنيه هنا وبتتحول لقروش أوتوماتيك */
function offer(
  id: string,
  variantId: string,
  vendorId: string,
  priceEGP: number,
  stock: number,
  sold: number,
  rating: number,
  reviews: number,
  tiers: [number, number][],
  extra: { oldPriceEGP?: number; badges?: string[] } = {},
): Offer {
  return {
    id,
    variantId,
    vendorId,
    price: Math.round(priceEGP * 100),
    oldPrice: extra.oldPriceEGP ? Math.round(extra.oldPriceEGP * 100) : undefined,
    tiers: tiers.map(([minQty, p]) => ({ minQty, price: Math.round(p * 100) })),
    stock,
    sold,
    rating,
    reviews,
    badges: extra.badges,
  };
}

export const offers: Offer[] = [
  // سباجيتي رفيع 400 جم — ٣ شركات بتبيعه، نفس الصنف بأسعار مختلفة
  offer('of-01', 'v-01a', 'aswaq', 28, 640, 1840, 4.7, 213, [[12, 25], [48, 22.5], [120, 20]], { oldPriceEGP: 34, badges: ['الأكثر مبيعاً'] }),
  offer('of-02', 'v-01a', 'delta-trade', 26.5, 300, 720, 4.3, 88, [[12, 24], [48, 21.5]]),
  offer('of-03', 'v-01a', 'saeed-co', 27, 850, 610, 4.5, 64, [[12, 24.5], [60, 21]]),
  offer('of-04', 'v-01b', 'aswaq', 64, 220, 430, 4.6, 95, [[8, 59], [30, 54]], { badges: ['عبوة كبيرة'] }),

  // بيني ريجينا
  offer('of-05', 'v-02a', 'aswaq', 31, 410, 1160, 4.5, 168, [[12, 28], [48, 25]]),
  offer('of-06', 'v-02a', 'bahr-dist', 30, 190, 340, 4.2, 47, [[12, 27], [48, 24]]),
  offer('of-07', 'v-02b', 'aswaq', 56, 160, 210, 4.4, 38, [[10, 51], [40, 47]]),

  // فارفالليه
  offer('of-08', 'v-03a', 'nile-foods', 42, 95, 520, 4.4, 61, [[10, 38], [40, 34]]),
  offer('of-09', 'v-03a', 'masr-pasta', 39.5, 140, 90, 3.9, 12, [[10, 36]], { badges: ['جديد'] }),

  // فوسيلي الملكة
  offer('of-10', 'v-04a', 'delta-trade', 30, 0, 480, 4.3, 44, [[12, 27], [48, 24]]),
  offer('of-11', 'v-04a', 'aswaq', 31.5, 520, 690, 4.6, 102, [[12, 28.5], [48, 25.5]]),
  offer('of-12', 'v-04b', 'saeed-co', 68, 180, 150, 4.1, 26, [[8, 63], [30, 58]]),

  // لازانيا باريلا
  offer('of-13', 'v-05a', 'nile-foods', 78, 152, 980, 4.9, 302, [[6, 72], [24, 66]], { oldPriceEGP: 89, badges: ['مستورد'] }),
  offer('of-14', 'v-05a', 'bahr-dist', 81, 60, 210, 4.6, 44, [[6, 75]]),

  // صدف زمان
  offer('of-15', 'v-06a', 'saeed-co', 26, 780, 1290, 4.1, 37, [[12, 23.5], [60, 21]], { badges: ['أوفر سعر'] }),

  // كوع ريجينا
  offer('of-16', 'v-07a', 'aswaq', 27, 520, 1520, 4.6, 129, [[12, 24], [48, 21.5]]),
  offer('of-17', 'v-07a', 'delta-trade', 25.5, 410, 880, 4.2, 71, [[12, 23], [48, 20.5]], { badges: ['أوفر سعر'] }),
  offer('of-18', 'v-07b', 'aswaq', 60, 140, 190, 4.4, 33, [[8, 55], [30, 50]]),

  // لسان عصفور
  offer('of-19', 'v-08a', 'aswaq', 24, 300, 1080, 4.5, 88, [[12, 21.5], [60, 19]]),
  offer('of-20', 'v-08a', 'masr-pasta', 23, 220, 130, 4.0, 15, [[12, 21]]),

  // سباجيتي سميك
  offer('of-21', 'v-09a', 'delta-trade', 62, 220, 360, 4.2, 51, [[8, 57], [30, 52]]),

  // بيني ريجاتي
  offer('of-22', 'v-10a', 'nile-foods', 71, 64, 640, 4.8, 176, [[6, 66]], { badges: ['مستورد'] }),

  // فوسيلي بالخضار
  offer('of-23', 'v-11a', 'saeed-co', 38, 130, 240, 4.0, 22, [[12, 34]], { badges: ['جديد'] }),

  // صدف كبير
  offer('of-24', 'v-12a', 'aswaq', 46, 187, 570, 4.4, 73, [[10, 42], [36, 38]]),
  offer('of-25', 'v-12a', 'bahr-dist', 44.5, 90, 180, 4.1, 29, [[10, 41]]),
];

/** قواعد تجارية مبدئية — كلها محتاجة تأكيد من العميل */
export const rules = {
  /** الحد الأدنى لقيمة الطلب بالقروش — بند حاسم في اقتصاديات شحن المعكرونة */
  minOrderValue: 30000,
  /** الشحن مجاناً فوق هذه القيمة */
  freeShippingOver: 75000,
  /** سعر شحن ثابت مبدئي، المفترض يختلف حسب المحافظة والوزن */
  flatShipping: 4500,
};

// ————————————————————————————————————————————————————————————
// دوال مساعدة
// ————————————————————————————————————————————————————————————

export const brandById = (id: string) => brands.find((b) => b.id === id);
export const vendorById = (id: string) => vendors.find((v) => v.id === id);
export const shapeById = (id: ShapeId) => shapes.find((s) => s.id === id);
export const productById = (id: string) => products.find((p) => p.id === id);
export const variantById = (id: string) => variants.find((v) => v.id === id);
export const offerById = (id: string) => offers.find((o) => o.id === id);

export const variantsOf = (productId: string) =>
  variants.filter((v) => v.productId === productId).sort((a, b) => a.weight - b.weight);

export const offersForVariant = (variantId: string) =>
  offers.filter((o) => o.variantId === variantId);

/** كل عروض الصنف عبر كل أحجامه */
export const offersForProduct = (productId: string) => {
  const ids = variantsOf(productId).map((v) => v.id);
  return offers.filter((o) => ids.includes(o.variantId));
};

/** العرض المرشّح: الأرخص المتوفر — ومع تفضيل شركة معيّنة لو السلة مقفولة عليها */
export function bestOffer(offerList: Offer[], preferVendorId?: string): Offer | undefined {
  if (offerList.length === 0) return undefined;
  const inStock = offerList.filter((o) => o.stock > 0);
  const pool = inStock.length > 0 ? inStock : offerList;
  if (preferVendorId) {
    const preferred = pool
      .filter((o) => o.vendorId === preferVendorId)
      .sort((a, b) => a.price - b.price)[0];
    if (preferred) return preferred;
  }
  return [...pool].sort((a, b) => a.price - b.price)[0];
}

/** الصنف اللي العرض ده تابع له */
export function productOfOffer(offerId: string): Product | undefined {
  const o = offerById(offerId);
  if (!o) return undefined;
  const v = variantById(o.variantId);
  return v ? productById(v.productId) : undefined;
}

/** أصناف الشركة — بدون تكرار */
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

/** الشركات مرتّبة بالمبيعات */
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

/** تحويل القروش لنص معروض */
export const egp = (piastres: number) => {
  const value = piastres / 100;
  const hasFraction = piastres % 100 !== 0;
  return `${value.toLocaleString('en-EG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} ج.م`;
};

/** السعر للكيلو — للمقارنة العادلة بين الأحجام */
export const pricePerKg = (piastres: number, weightGrams: number) =>
  Math.round((piastres / weightGrams) * 1000);
