import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fromAddress, type BuyerLocation } from '../lib/buyerLocation';

/**
 * مكان المشتري في المعرض — واحد للرئيسية وصفحات المتاجر، ومتفتكر على الجهاز
 * (الزائر ملوش حساب نحفظه عليه). شوف lib/buyerLocation.
 */

const KEY = 'aswaq_location';

function load(): BuyerLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? (JSON.parse(raw) as BuyerLocation) : null;
    return value && Number.isFinite(value.lat) && Number.isFinite(value.lng) ? value : null;
  } catch {
    return null;
  }
}

function save(value: BuyerLocation | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
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
