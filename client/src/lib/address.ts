import type { BusinessAddress } from '../context/AuthContext';

/** العنوان كسطر واحد — نفس ترتيب ما بيتكتب على أي ظرف */
export function oneLine(a: BusinessAddress): string {
  return [a.street, a.district, a.city, a.governorate, a.country].filter(Boolean).join('، ');
}
