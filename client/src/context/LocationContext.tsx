import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fromAddress, type BuyerLocation } from '../lib/buyerLocation';

/**
 * مكان المشتري في المعرض — واحد للرئيسية وصفحات المتاجر. شوف lib/buyerLocation.
 *
 * مكالمة ٣٠ سبتمبر: العنوان من «عناويني» بس اللي بيتفتكر على الجهاز (localStorage).
 * «موقعي الحالي» ونقطة الخريطة مكان مؤقت — المشتري ممكن يكون مسافر، والمكان
 * القديم بيرتّب المتاجر غلط — فبيفضلوا طول الزيارة بس (sessionStorage) ويتسألوا
 * تاني بعد ما الموقع يتقفل ويتفتح. محدش منهم بيتبعت للسيرفر.
 */

const KEY = 'aswaq_location';

const valid = (value: BuyerLocation | null) => (value && Number.isFinite(value.lat) && Number.isFinite(value.lng) ? value : null);

function read(storage: Storage): BuyerLocation | null {
  try {
    const raw = storage.getItem(KEY);
    return valid(raw ? (JSON.parse(raw) as BuyerLocation) : null);
  } catch {
    return null;
  }
}

function load(): BuyerLocation | null {
  const visit = read(sessionStorage);
  if (visit) return visit;
  const kept = read(localStorage);
  // مكان مؤقت اتحفظ قبل ٣٠ سبتمبر — ميترجعش
  if (kept && kept.source !== 'address') {
    save(null);
    return null;
  }
  return kept;
}

function save(value: BuyerLocation | null) {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (value) (value.source === 'address' ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(value));
  } catch {
    // المتصفح قافل التخزين — المكان يفضل لحد ما الصفحة تتقفل
  }
}

interface LocationContextValue {
  /** null = لسه محددش — المتاجر بتترتب الأحدث الأول، ومفيش توصيل */
  location: BuyerLocation | null;
  setLocation: (location: BuyerLocation | null) => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, userAddresses } = useAuth();
  const [location, setLocationState] = useState<BuyerLocation | null>(load);

  const setLocation = useCallback((next: BuyerLocation | null) => {
    setLocationState(next);
    save(next);
  }, []);

  // عنوان من «عناويني» اتعدّل أو اتمسح — المكان بيمشي وراه
  useEffect(() => {
    if (!location?.addressId || !userAddresses) return;
    const address = userAddresses.find((a) => a.id === location.addressId);
    if (!address) {
      setLocation(null);
      return;
    }
    const current = fromAddress(address);
    if (current.lat !== location.lat || current.lng !== location.lng || current.label !== location.label) {
      setLocation(current);
    }
  }, [userAddresses, location, setLocation]);

  // الجهاز ممكن يكون مشترك: عنوان المستخدم ميفضلش عليه بعد ما يخرج
  useEffect(() => {
    if (!user && location?.addressId) setLocation(null);
  }, [user, location, setLocation]);

  return <LocationContext.Provider value={{ location, setLocation }}>{children}</LocationContext.Provider>;
}

export function useBuyerLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useBuyerLocation must be used within LocationProvider');
  return ctx;
}
