import type { Vehicle } from '../context/AuthContext';
import { egp } from '../lib/money';

const amount = (n: number) => n.toLocaleString('en-EG', { maximumFractionDigits: 2 });

/**
 * مركبة في ليستة مركبات النشاط: رقم اللوحة، وتحته الحمولة وتكلفة التوصيل
 * والجراج. الدوسة بتفتحها في فورمها للتعديل — نفس كارت المقر.
 */
export function VehicleCard({ vehicle, garage, onOpen }: { vehicle: Vehicle; garage: string | null; onOpen: () => void }) {
  const load = [
    vehicle.maxWeightKg !== null && `${amount(vehicle.maxWeightKg)} كجم`,
    vehicle.maxVolumeM3 !== null && `${amount(vehicle.maxVolumeM3)} م³`,
  ].filter(Boolean);
  const cost = [
    vehicle.startCost !== null && `البداية ${egp(vehicle.startCost)}`,
    vehicle.costPerKm !== null && `الكيلو ${egp(vehicle.costPerKm)}`,
  ].filter(Boolean);

  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-gray-50 dark:hover:bg-white/5"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold">{vehicle.plateNumber}</span>
          <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
            {load.length > 0 ? `بتشيل لحد ${load.join(' · ')}` : 'الحمولة لسه متحددتش'}
          </span>
          {cost.length > 0 && <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{cost.join(' · ')}</span>}
          {garage && <span className="mt-0.5 block truncate text-xs text-gray-400">الجراج: {garage}</span>}
        </span>
        {/* RTL: «افتح» بيشاور على الشمال */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
    </li>
  );
}
