/**
 * كتالوج تجريبي (mock) — لا يوجد خادم بعد.
 * الغرض منه عرض الواجهة على العميل واستخراج المتطلبات:
 * كل حقل هنا هو سؤال مفتوح للعميل (هل نحتاجه؟ من يملأه؟ البائع ولا الإدارة؟).
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

export interface Vendor {
  id: string;
  name: string;
  /** 'own' = مخازن أسواق نفسها، 'partner' = بائع خارجي يشحن بنفسه */
  kind: 'own' | 'partner';
  city: string;
  rating: number;
}

/** شريحة سعر للجملة: من كذا قطعة، السعر للقطعة كذا */
export interface PriceTier {
  minQty: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  shape: ShapeId;
  vendorId: string;
  /** الوزن بالجرام للعبوة الواحدة */
  weight: number;
  /** سعر التجزئة للعبوة بالجنيه */
  price: number;
  /** سعر قبل الخصم — للعرض فقط */
  oldPrice?: number;
  /** شرائح أسعار الجملة، تظهر لحسابات التجار فقط */
  tiers: PriceTier[];
  stock: number;
  rating: number;
  reviews: number;
  badges?: string[];
}

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
  { id: 'aswaq', name: 'مخازن أسواق', kind: 'own', city: 'القاهرة', rating: 4.8 },
  { id: 'nile-foods', name: 'النيل للأغذية', kind: 'partner', city: 'الجيزة', rating: 4.5 },
  { id: 'delta-trade', name: 'الدلتا للتجارة', kind: 'partner', city: 'طنطا', rating: 4.2 },
  { id: 'saeed-co', name: 'شركة الصعيد', kind: 'partner', city: 'أسيوط', rating: 4.6 },
];

export const products: Product[] = [
  {
    id: 'p-001',
    name: 'سباجيتي رفيع',
    brandId: 'malika',
    shape: 'spaghetti',
    vendorId: 'aswaq',
    weight: 400,
    price: 28,
    oldPrice: 34,
    tiers: [
      { minQty: 12, price: 25 },
      { minQty: 48, price: 22.5 },
      { minQty: 120, price: 20 },
    ],
    stock: 640,
    rating: 4.7,
    reviews: 213,
    badges: ['الأكثر مبيعاً'],
  },
  {
    id: 'p-002',
    name: 'مكرونة قلم بيني',
    brandId: 'regina',
    shape: 'penne',
    vendorId: 'aswaq',
    weight: 400,
    price: 31,
    tiers: [
      { minQty: 12, price: 28 },
      { minQty: 48, price: 25 },
    ],
    stock: 410,
    rating: 4.5,
    reviews: 168,
  },
  {
    id: 'p-003',
    name: 'فارفالليه فيونكة',
    brandId: 'italiano',
    shape: 'farfalle',
    vendorId: 'nile-foods',
    weight: 500,
    price: 42,
    tiers: [
      { minQty: 10, price: 38 },
      { minQty: 40, price: 34 },
    ],
    stock: 95,
    rating: 4.4,
    reviews: 61,
  },
  {
    id: 'p-004',
    name: 'فوسيلي لولبي',
    brandId: 'malika',
    shape: 'fusilli',
    vendorId: 'delta-trade',
    weight: 400,
    price: 30,
    tiers: [
      { minQty: 12, price: 27 },
      { minQty: 48, price: 24 },
    ],
    stock: 0,
    rating: 4.3,
    reviews: 44,
  },
  {
    id: 'p-005',
    name: 'شرائح لازانيا',
    brandId: 'barilla',
    shape: 'lasagna',
    vendorId: 'nile-foods',
    weight: 500,
    price: 78,
    oldPrice: 89,
    tiers: [
      { minQty: 6, price: 72 },
      { minQty: 24, price: 66 },
    ],
    stock: 152,
    rating: 4.9,
    reviews: 302,
    badges: ['مستورد'],
  },
  {
    id: 'p-006',
    name: 'مكرونة صدف',
    brandId: 'zaman',
    shape: 'shells',
    vendorId: 'saeed-co',
    weight: 400,
    price: 26,
    tiers: [
      { minQty: 12, price: 23.5 },
      { minQty: 60, price: 21 },
    ],
    stock: 780,
    rating: 4.1,
    reviews: 37,
    badges: ['أوفر سعر'],
  },
  {
    id: 'p-007',
    name: 'مكرونة كوع',
    brandId: 'regina',
    shape: 'elbow',
    vendorId: 'aswaq',
    weight: 400,
    price: 27,
    tiers: [
      { minQty: 12, price: 24 },
      { minQty: 48, price: 21.5 },
    ],
    stock: 520,
    rating: 4.6,
    reviews: 129,
  },
  {
    id: 'p-008',
    name: 'لسان عصفور',
    brandId: 'malika',
    shape: 'orzo',
    vendorId: 'aswaq',
    weight: 350,
    price: 24,
    tiers: [
      { minQty: 12, price: 21.5 },
      { minQty: 60, price: 19 },
    ],
    stock: 300,
    rating: 4.5,
    reviews: 88,
  },
  {
    id: 'p-009',
    name: 'سباجيتي سميك',
    brandId: 'italiano',
    shape: 'spaghetti',
    vendorId: 'delta-trade',
    weight: 1000,
    price: 62,
    tiers: [
      { minQty: 8, price: 57 },
      { minQty: 30, price: 52 },
    ],
    stock: 220,
    rating: 4.2,
    reviews: 51,
    badges: ['عبوة كبيرة'],
  },
  {
    id: 'p-010',
    name: 'بيني ريجاتي مضلّع',
    brandId: 'barilla',
    shape: 'penne',
    vendorId: 'nile-foods',
    weight: 500,
    price: 71,
    tiers: [{ minQty: 6, price: 66 }],
    stock: 64,
    rating: 4.8,
    reviews: 176,
    badges: ['مستورد'],
  },
  {
    id: 'p-011',
    name: 'فوسيلي بالخضار',
    brandId: 'zaman',
    shape: 'fusilli',
    vendorId: 'saeed-co',
    weight: 400,
    price: 38,
    tiers: [{ minQty: 12, price: 34 }],
    stock: 130,
    rating: 4.0,
    reviews: 22,
    badges: ['جديد'],
  },
  {
    id: 'p-012',
    name: 'صدف كبير للحشو',
    brandId: 'italiano',
    shape: 'shells',
    vendorId: 'aswaq',
    weight: 500,
    price: 46,
    tiers: [
      { minQty: 10, price: 42 },
      { minQty: 36, price: 38 },
    ],
    stock: 187,
    rating: 4.4,
    reviews: 73,
  },
];

/** قواعد تجارية مبدئية — كلها محتاجة تأكيد من العميل */
export const rules = {
  /** الحد الأدنى لقيمة الطلب — بند حاسم في اقتصاديات شحن المعكرونة */
  minOrderValue: 300,
  /** الشحن مجاناً فوق هذه القيمة */
  freeShippingOver: 750,
  /** سعر شحن ثابت مبدئي، المفترض يختلف حسب المحافظة والوزن */
  flatShipping: 45,
};

export const brandById = (id: string) => brands.find((b) => b.id === id);
export const vendorById = (id: string) => vendors.find((v) => v.id === id);
export const shapeById = (id: ShapeId) => shapes.find((s) => s.id === id);
export const productById = (id: string) => products.find((p) => p.id === id);

export const egp = (n: number) =>
  `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })} ج.م`;
