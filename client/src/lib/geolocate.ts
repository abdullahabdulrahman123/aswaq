import { matchCity, matchGovernorate, normalizeArabic } from '../data/egypt';

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
  /** الحي — جوجل بيرجّعه، BigDataCloud لأ فبيفضل فاضي */
  district: string;
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
    district: '',
  };
}

/**
 * جوجل بيتنده من مكتبة الخرائط بتاعته مش بطلب مباشر لـ
 * maps.googleapis.com/maps/api/geocode/json.
 *
 * السبب: الطلب المباشر بيرفض أي مفتاح مقيّد بدومين ("API keys with referer
 * restrictions cannot be used with this API")، يعني كنا هنضطر نشيل التقييد
 * ونسيب المفتاح مكشوف في كود الموقع لأي حد ياخده ويستهلك بيه.
 * المكتبة معمولة للمتصفح فبتقبل التقييد بالدومين، والمفتاح يفضل محمي.
 *
 * بنحمّل المكتبة أول مرة بس، وبنستخدم منها الـGeocoder — من غير ما نعمل
 * خريطة، فمفيش تكلفة "تحميل خريطة"؛ العرض كله على Leaflet وOpenStreetMap.
 */

interface GoogleAddressComponent {
  long_name: string;
  types: string[];
}
interface GoogleGeocoderResult {
  address_components: GoogleAddressComponent[];
}
interface GoogleGeocoder {
  geocode(req: { location: { lat: number; lng: number } }): Promise<{ results: GoogleGeocoderResult[] }>;
}
interface GoogleMapsNamespace {
  Geocoder: new () => GoogleGeocoder;
}

const MAPS_READY_CALLBACK = '__aswaqGoogleMapsReady';
let mapsLoader: Promise<GoogleMapsNamespace> | null = null;

function loadGoogleMaps(): Promise<GoogleMapsNamespace> {
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown> & {
      google?: { maps?: GoogleMapsNamespace };
    };

    w[MAPS_READY_CALLBACK] = () => {
      const maps = w.google?.maps;
      if (maps) resolve(maps);
      else reject(new GeolocateError('خدمة العناوين محمّلتش صح. اكتب العنوان يدوي.'));
    };

    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(GOOGLE_KEY)}&language=ar&loading=async&callback=${MAPS_READY_CALLBACK}`;
    script.async = true;
    script.onerror = () => {
      // نصفّر عشان المحاولة الجاية تعيد التحميل بدل ما تفضل عالقة على وعد فاشل
      mapsLoader = null;
      reject(new GeolocateError('مقدرناش نحمّل خدمة العناوين. اتأكد من النت أو اكتب العنوان يدوي.'));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

async function viaGoogle({ lat, lng }: Coords): Promise<DetectedPlace> {
  const maps = await loadGoogleMaps();

  let results: GoogleGeocoderResult[];
  try {
    ({ results } = await new maps.Geocoder().geocode({ location: { lat, lng } }));
  } catch (err) {
    console.error('[geocode] Google رفض الطلب:', err);
    throw new GeolocateError('خدمة العناوين مش متاحة دلوقتي. اكتب العنوان يدوي.');
  }
  if (!results?.length) {
    throw new GeolocateError('مفيش عنوان معروف للنقطة دي. اكتب العنوان يدوي.');
  }

  const parts = results[0].address_components;
  const pick = (type: string) => parts.find((c) => c.types.includes(type))?.long_name.trim() ?? '';

  /**
   * جوجل في مصر مبيرجّعش locality خالص. الشكل اللي بيرجّعه:
   *   admin_1 = المحافظة   ("محافظة الدقهلية")
   *   admin_2 = القسم/المركز ("اول المنصورة"، "قسم قصر النيل")
   *   admin_3 = الحي         ("ميدان التحرير"، "شياخة ثالثة")
   * فبنستخرج المدينة من admin_2 بمطابقتها على قايمة مدن المحافظة.
   */
  const governorate = matchGovernorate(pick('administrative_area_level_1'));
  const area = pick('administrative_area_level_2');
  const city = governorate ? matchCity(governorate, area) : null;

  return {
    country: pick('country'),
    governorate,
    city: city ?? '',
    /*
     * لو admin_2 هو اللي طلعت منه المدينة ("اول المنصورة" ← المنصورة)، يبقى
     * الحي هو admin_3. لو المدينة جت من اسم المحافظة (زي القاهرة)، يبقى
     * admin_2 نفسه حي ("قسم قصر النيل").
     * المقارنة بعد توحيد الألف عشان "اول اسوان" تتطابق مع "أسوان".
     */
    district:
      (city && area && normalizeArabic(area).includes(normalizeArabic(city))
        ? pick('administrative_area_level_3')
        : area || pick('administrative_area_level_3')) || '',
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
