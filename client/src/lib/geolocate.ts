import { matchGovernorate } from '../data/egypt';

/**
 * تحديد الموقع وتحويل الإحداثيات لأسماء (دولة / محافظة / مدينة).
 *
 * الإحداثيات بتيجي من المتصفح نفسه (navigator.geolocation) — مفيش مكتبة ولا مفتاح.
 * تحويلها لأسماء بيتعمل بواحدة من اتنين، حسب إن كان مفتاح جوجل مضبوط ولا لأ:
 *
 *  • جوجل (لو المفتاح موجود) — أدق في مصر، وبيشتغل على أي نقطة على الخريطة،
 *    فسحب الدبوس بيجيب العنوان الجديد تلقائي.
 *
 *  • BigDataCloud (لو مفيش مفتاح) — مجانية من غير حساب ولا كارت، بس شروطها
 *    بتحصر الاستخدام في *موقع الجهاز الحقيقي*. عشان كده لما نبقى عليها،
 *    سحب الدبوس بيغيّر الإحداثيات المحفوظة وبس ومبيعيدش جلب الأسماء.
 *
 * الملف ده هو المكان الوحيد اللي بيعرف مين الخدمة — الواجهة بتنادي
 * detectPlace/lookupPoint وخلاص.
 */

const BDC_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const GOOGLE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
/** المتصفح ممكن يفضل مستني الـGPS للأبد — بنقطع بعد ١٥ ثانية */
const GEO_TIMEOUT_MS = 15_000;

/** متغيّرات النشر الفاضية بتوصل كنص فاضي مش undefined */
const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

/** هل نقدر نجيب عنوان أي نقطة، ولا موقع الجهاز بس؟ */
export const canLookupAnyPoint = GOOGLE_KEY.length > 0;

export interface Coords {
  lat: number;
  lng: number;
}

export interface DetectedPlace {
  country: string;
  /** اسم المحافظة زي ما هو في قايمتنا، أو null لو مقدرناش نطابقه */
  governorate: string | null;
  city: string;
}

/** رسائل مفهومة بدل أكواد المتصفح */
export class GeolocateError extends Error {}

export function getCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocateError('المتصفح ده مبيدعمش تحديد الموقع. اكتب العنوان يدوي.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new GeolocateError('مسمحتش للمتصفح بمعرفة موقعك. اكتب العنوان يدوي أو اسمح وجرّب تاني.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new GeolocateError('مقدرناش نحدد موقعك دلوقتي. اكتب العنوان يدوي.'));
            break;
          case err.TIMEOUT:
            reject(new GeolocateError('تحديد الموقع أخد وقت طويل. جرّب تاني أو اكتب العنوان يدوي.'));
            break;
          default:
            reject(new GeolocateError('حصلت مشكلة في تحديد الموقع. اكتب العنوان يدوي.'));
        }
      },
      { timeout: GEO_TIMEOUT_MS, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  });
}

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new GeolocateError('مقدرناش نوصل لخدمة تحديد المكان. اتأكد من النت أو اكتب العنوان يدوي.');
  }
  if (!res.ok) throw new GeolocateError('خدمة تحديد المكان مردّتش. اكتب العنوان يدوي.');
  return res.json();
}

async function viaBigDataCloud({ lat, lng }: Coords): Promise<DetectedPlace> {
  const data = (await fetchJson(
    `${BDC_ENDPOINT}?latitude=${lat}&longitude=${lng}&localityLanguage=ar`,
  )) as { countryName?: string; principalSubdivision?: string; city?: string };

  return {
    country: data.countryName?.trim() || '',
    governorate: matchGovernorate(data.principalSubdivision),
    // locality بتيجي غلط أحياناً (رجّعت "السنبلاوين" لنقطة في القاهرة)، فبنعتمد على city
    city: data.city?.trim() || '',
  };
}

interface GoogleComponent {
  long_name: string;
  types: string[];
}

async function viaGoogle({ lat, lng }: Coords): Promise<DetectedPlace> {
  const data = (await fetchJson(
    `${GOOGLE_ENDPOINT}?latlng=${lat},${lng}&language=ar&key=${encodeURIComponent(GOOGLE_KEY)}`,
  )) as { status?: string; error_message?: string; results?: { address_components: GoogleComponent[] }[] };

  if (data.status === 'ZERO_RESULTS') {
    throw new GeolocateError('مفيش عنوان معروف للنقطة دي. اكتب العنوان يدوي.');
  }
  if (data.status !== 'OK' || !data.results?.length) {
    // مفتاح غلط أو الحصة خلصت — نقول رسالة عامة للمستخدم ونسيب التفصيلة للكونسول
    console.error('[geocode] Google رفض الطلب:', data.status, data.error_message);
    throw new GeolocateError('خدمة العناوين مش متاحة دلوقتي. اكتب العنوان يدوي.');
  }

  const parts = data.results[0].address_components;
  const pick = (type: string) => parts.find((c) => c.types.includes(type))?.long_name.trim() ?? '';

  return {
    country: pick('country'),
    governorate: matchGovernorate(pick('administrative_area_level_1')),
    // جوجل بيحط المدينة في locality، وبعض المناطق بتيجي في المستوى الإداري التاني
    city: pick('locality') || pick('administrative_area_level_2'),
  };
}

/** عنوان أي نقطة — بيستخدم جوجل لو المفتاح موجود، وإلا BigDataCloud */
export function lookupPoint(coords: Coords): Promise<DetectedPlace> {
  return canLookupAnyPoint ? viaGoogle(coords) : viaBigDataCloud(coords);
}

/** موقع الجهاز الحالي + عنوانه */
export async function detectPlace(): Promise<{ coords: Coords; place: DetectedPlace }> {
  const coords = await getCoords();
  return { coords, place: await lookupPoint(coords) };
}
