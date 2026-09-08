import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coords } from '../lib/geolocate';

/**
 * خريطة لاختيار موقع النشاط.
 *
 * Leaflet بيرسم بس — الخرائط نفسها من OpenStreetMap، وتحويل النقطة لعنوان
 * بيحصل بره في lib/geolocate. سياسة OSM بتلزمنا نكتب المصدر ظاهر، وده
 * معمول في attribution تحت.
 *
 * ملاحظة عن Leaflet: بيحمّل صور الدبوس من مسار نسبي، وده بيقع مع Vite لأن
 * الملفات بتتنقل وقت البناء. عشان كده بنرسم الدبوس بـdivIcon (HTML عادي)
 * بدل الصور — أخف وميعتمدش على أي ملف.
 */

const PIN = L.divIcon({
  className: '',
  html:
    '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);' +
    'background:#c2703a;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface Props {
  value: Coords;
  onChange: (coords: Coords) => void;
  /** بيظهر تحت الخريطة — بيوضّح إن سحب الدبوس هيعمل إيه */
  hint: string;
}

export function LocationPicker({ value, onChange, hint }: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  /** آخر قيمة إحنا اللي بعتناها لبرّه — عشان منحركش الخريطة رداً على تغييرنا إحنا */
  const selfSetRef = useRef<string>('');

  // إنشاء الخريطة مرة واحدة
  useEffect(() => {
    if (!holderRef.current || mapRef.current) return;

    const map = L.map(holderRef.current, {
      center: [value.lat, value.lng],
      zoom: 14,
      // العجلة بتخطف تمرير الصفحة والمستخدم بيبقى بيقرا فورم — الزوم بالأزرار
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([value.lat, value.lng], { draggable: true, icon: PIN, keyboard: true }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      selfSetRef.current = `${lat},${lng}`;
      onChange({ lat, lng });
    });

    // الدوس على الخريطة بينقل الدبوس كمان — أسرع من السحب لمسافة بعيدة
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng(e.latlng);
      selfSetRef.current = `${lat},${lng}`;
      onChange({ lat, lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // مرة واحدة بس — التحديثات بعد كده في الـeffect اللي تحت
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لما الإحداثيات تتغيّر من بره (زرار "حدّد موقعي")
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (selfSetRef.current === `${value.lat},${value.lng}`) return;

    marker.setLatLng([value.lat, value.lng]);
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14));
  }, [value.lat, value.lng]);

  return (
    <div>
      <div
        ref={holderRef}
        role="application"
        aria-label="خريطة لاختيار موقع النشاط"
        className="h-64 w-full overflow-hidden rounded-xl border border-stone-300 dark:border-white/15"
      />
      <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{hint}</p>
    </div>
  );
}
