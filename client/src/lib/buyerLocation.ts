import type { BusinessAddress } from '../context/AuthContext';
import { oneLine } from './address';
import type { Coords } from './geolocate';

/**
 * مكان المشتري — المعرض بيرتّب المتاجر من الأقرب له، وبيعرف منه مين بيوصّله.
 * بييجي من عنوان من «عناويني»، أو «موقعي الحالي» من المتصفح، أو نقطة من الخريطة.
 */
export interface BuyerLocation extends Coords {
  source: 'address' | 'device' | 'map';
  /** اللي بيظهر في شريط المكان */
  label: string;
  /** العنوان من «عناويني» لو اتختار منها — عشان تعديله أو مسحه يوصل هنا */
  addressId?: string;
}

export function fromAddress(address: BusinessAddress): BuyerLocation {
  return {
    source: 'address',
    lat: address.lat,
    lng: address.lng,
    label: oneLine(address) || 'عنوان من عناويني',
    addressId: address.id,
  };
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** المسافة بالكيلو بخط مستقيم (مش بالطريق) — زي ما اتفقنا مع العميل */
export function distanceKm(a: Coords, b: Coords): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ٠٫٨ → «800 م»، ٢٫٣٤ → «2.3 كم»، ١٢٫٦ → «13 كم» */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} م`;
  return `${km < 10 ? km.toFixed(1).replace(/\.0$/, '') : Math.round(km)} كم`;
}

/**
 * المتجر بيوصّل للمكان ده؟ لأ لو المتجر ملوش نطاق (صاحبه محددش)، أو مكانه
 * مش معروف، أو المشتري لسه محددش مكانه.
 */
export function deliversTo(store: Coords | null, radiusKm: number | null | undefined, buyer: Coords | null): boolean {
  if (!store || !buyer || radiusKm == null) return false;
  return distanceKm(store, buyer) <= radiusKm;
}
