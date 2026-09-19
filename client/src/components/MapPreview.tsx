import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PIN } from './LocationPicker';

/**
 * خريطة صغيرة ثابتة لعنوان المقر في فورمه — عشان المستخدم يتأكد إن المكان
 * صح من غير ما يفتح «حدد العنوان». مبتتحركش: التعديل من «غيّر العنوان».
 */
export function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!holderRef.current) return;
    const map = L.map(holderRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    });
    // سياسة OSM بتلزمنا نكتب المصدر ظاهر حتى في الخريطة الصغيرة
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([lat, lng], { icon: PIN, interactive: false, keyboard: false }).addTo(map);

    // جوه <dialog> الحاوية بتبقى بمقاس صفر لحظة الإنشاء — زي LocationPicker
    const raf = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, [lat, lng]);

  return <div ref={holderRef} aria-hidden="true" className="isolate h-28 w-full" />;
}
