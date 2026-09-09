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

/**
 * زرار "موقعي" جوه الخريطة، تحت أزرار التكبير مباشرة.
 * علامة تصويب (crosshair) — دي العلامة المتعارف عليها في كل الخرائط
 * لتحديد موقعك، فالمستخدم بيعرفها من غير شرح.
 */
const LOCATE_ICON =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>' +
  '<line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/>' +
  '<line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/></svg>';

interface Props {
  value: Coords;
  onChange: (coords: Coords) => void;
  /** بيظهر تحت الخريطة — بيوضّح إن سحب الدبوس هيعمل إيه */
  hint: string;
  /** تحديد الموقع تلقائي — نفس اللي بيعمله الزرار اللي فوق الخريطة */
  onLocate: () => void;
  /** بنعطّل الزرار وهو شغّال عشان مفيش طلبين مع بعض */
  locating: boolean;
}

export function LocationPicker({ value, onChange, hint, onLocate, locating }: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const locateBtnRef = useRef<HTMLAnchorElement | null>(null);
  /**
   * الزرار بيتعمل مرة واحدة مع الخريطة، فلو ربطنا onLocate عليه مباشرة
   * هيفضل ماسك أول نسخة منها للأبد. الـref بيخلّي الضغطة تنادي آخر نسخة.
   */
  const onLocateRef = useRef(onLocate);
  onLocateRef.current = onLocate;
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

    // زرار "موقعي" كعنصر تحكم في الخريطة، تحت أزرار التكبير
    const LocateControl = L.Control.extend({
      options: { position: 'topleft' as L.ControlPosition },
      onAdd() {
        const wrap = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', '', wrap) as HTMLAnchorElement;
        btn.href = '#';
        btn.title = 'حدّد موقعي';
        btn.setAttribute('role', 'button');
        btn.innerHTML = LOCATE_ICON;
        btn.style.display = 'grid';
        btn.style.placeItems = 'center';
        // من غير ده الضغطة بتوصل للخريطة تحته وتنقل الدبوس
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          if (btn.getAttribute('aria-disabled') !== 'true') onLocateRef.current();
        });
        locateBtnRef.current = btn;
        return wrap;
      },
    });
    map.addControl(new LocateControl());

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

  // شكل زرار الموقع وهو شغّال
  useEffect(() => {
    const btn = locateBtnRef.current;
    if (!btn) return;
    btn.setAttribute('aria-disabled', String(locating));
    btn.style.opacity = locating ? '0.45' : '1';
    btn.style.cursor = locating ? 'progress' : 'pointer';
  }, [locating]);

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
        /*
         * isolate مهم: Leaflet بيدي طبقاته z-index من 400 لفوق، والناڤبار
         * عنده 30 — فالخريطة كانت بتعدّي فوقه وقت التمرير. isolation:isolate
         * بيعمل سياق تكديس مستقل، فأرقام Leaflet تفضل محبوسة جوه الخريطة.
         */
        className="isolate h-64 w-full overflow-hidden rounded-xl border border-stone-300 dark:border-white/15"
      />
      <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{hint}</p>
    </div>
  );
}
