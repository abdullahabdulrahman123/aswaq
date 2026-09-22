import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBuyerLocation } from '../context/LocationContext';
import { oneLine } from '../lib/address';
import { fromAddress } from '../lib/buyerLocation';
import { getCoords, GeolocateError, type Coords } from '../lib/geolocate';
import { AddressDialog, EMPTY_ADDRESS } from './AddressDialog';
import { LocationPicker } from './LocationPicker';
import { PinIcon } from './PinIcon';

const optionClass =
  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start text-sm transition disabled:cursor-progress disabled:opacity-60';
const idleOption = 'border-stone-300 hover:border-brand-400 dark:border-white/15 dark:hover:border-brand-400';
const pickedOption = 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/15';

/**
 * «مكانك» — المشتري بيحدد مكانه عشان المعرض يرتّب المتاجر من الأقرب ويعرف مين
 * بيوصّله. تلات طرق زي ما العميل قال: عنوان من «عناويني»، أو «موقعي الحالي»
 * من المتصفح، أو نقطة على الخريطة (دي مؤقتة، مبتتحفظش كعنوان).
 *
 * الزائر ملوش «عناويني» — بيختار بالموقع أو الخريطة، والمكان بيتفتكر على جهازه.
 */
export function LocationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user, userAddresses, userAddressesError, addUserAddress, signIn } = useAuth();
  const { location, setLocation } = useBuyerLocation();

  /** الخريطة بتتفتح مكان الاختيارات، مش فوقها */
  const [onMap, setOnMap] = useState(false);
  const [point, setPoint] = useState<Coords>(EMPTY_ADDRESS);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setOnMap(false);
    setPoint(location ?? EMPTY_ADDRESS);
    setLocating(false);
    setError('');
    setAddingAddress(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function locate(): Promise<Coords | null> {
    setLocating(true);
    setError('');
    try {
      return await getCoords();
    } catch (err) {
      setError(err instanceof GeolocateError ? err.message : 'حصلت مشكلة في تحديد الموقع.');
      return null;
    } finally {
      setLocating(false);
    }
  }

  async function handleCurrentLocation() {
    const coords = await locate();
    if (!coords) return;
    setLocation({ ...coords, source: 'device', label: 'موقعي الحالي' });
    onClose();
  }

  const signedIn = Boolean(user && !user.demo);

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={onClose}
        aria-label="مكانك"
        // العرض في style مش كلاس — نفس سبب AddressDialog
        style={{ width: 'min(32rem, 92vw)' }}
        className="rounded-2xl bg-white p-0 text-stone-900 shadow-card backdrop:bg-black/50 dark:bg-surface-card dark:text-stone-100"
      >
        {open && (
          <div className="max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-display text-lg font-bold">{onMap ? 'اختار مكانك على الخريطة' : 'مكانك'}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
              عشان نرتّبلك المتاجر من الأقرب، ونعرف مين بيوصّلك.
            </p>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {error}
              </p>
            )}

            {onMap ? (
              <>
                <div className="mt-4">
                  <LocationPicker
                    value={point}
                    onChange={setPoint}
                    onLocate={async () => {
                      const coords = await locate();
                      if (coords) setPoint(coords);
                    }}
                    locating={locating}
                    label="خريطة لاختيار مكانك"
                    hint="اسحب الدبوس أو دوس على الخريطة. المكان ده بيتفتكر على جهازك بس، مش بيتحفظ في عناوينك."
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setLocation({ lat: point.lat, lng: point.lng, source: 'map', label: 'مكان على الخريطة' });
                      onClose();
                    }}
                    className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    تم
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnMap(false)}
                    className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
                  >
                    رجوع
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 grid gap-2.5">
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={locating}
                    className={`${optionClass} ${location?.source === 'device' ? pickedOption : idleOption}`}
                  >
                    <span aria-hidden="true" className="text-base">📍</span>
                    <span className="font-medium">{locating ? 'بنحدد موقعك…' : 'موقعي الحالي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setOnMap(true);
                    }}
                    className={`${optionClass} ${location?.source === 'map' ? pickedOption : idleOption}`}
                  >
                    <span aria-hidden="true" className="text-base">🗺️</span>
                    <span className="font-medium">اختار من الخريطة</span>
                  </button>
                </div>

                <section className="mt-6">
                  <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400">عناويني</h3>
                  {signedIn ? (
                    <>
                      {userAddresses === null ? (
                        <p className="mt-2 text-sm text-stone-400">{userAddressesError || 'بنجيب عناوينك…'}</p>
                      ) : (
                        userAddresses.length > 0 && (
                          <ul aria-label="عناويني" className="mt-2 grid gap-2">
                            {userAddresses.map((address) => {
                              const picked = location?.addressId === address.id;
                              return (
                                <li key={address.id}>
                                  <button
                                    type="button"
                                    aria-pressed={picked}
                                    onClick={() => {
                                      setLocation(fromAddress(address));
                                      onClose();
                                    }}
                                    className={`${optionClass} ${picked ? pickedOption : idleOption}`}
                                  >
                                    <PinIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                                    <span className="min-w-0 flex-1 leading-relaxed">{oneLine(address)}</span>
                                    {picked && <span aria-hidden="true" className="font-bold text-brand-600 dark:text-brand-400">✓</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => setAddingAddress(true)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-brand-400 bg-brand-50/70 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
                      >
                        ＋ أضف عنوان
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                      <button
                        type="button"
                        onClick={() => signIn('login')}
                        className="font-semibold text-brand-700 hover:underline dark:text-brand-400"
                      >
                        سجّل دخولك
                      </button>{' '}
                      عشان تحفظ عناوينك وتختار منها.
                    </p>
                  )}
                </section>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium transition hover:border-stone-400 dark:border-white/15"
                  >
                    رجوع
                  </button>
                  {location && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocation(null);
                        onClose();
                      }}
                      className="text-sm font-medium text-stone-500 transition hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      امسح مكاني
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </dialog>

      {/* نافذة العنوان جنب دي مش جواها — زي فورم المقر */}
      <AddressDialog
        open={open && addingAddress}
        value={location ? { ...EMPTY_ADDRESS, lat: location.lat, lng: location.lng } : EMPTY_ADDRESS}
        premisesName=""
        placeNoun="العنوان"
        onDone={async (address) => {
          const saved = await addUserAddress(address);
          setLocation(fromAddress(saved));
          setAddingAddress(false);
          onClose();
        }}
        onClose={() => setAddingAddress(false)}
      />
    </>
  );
}
