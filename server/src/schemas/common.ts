import { z } from 'zod';

/**
 * Prisma بيرمي خطأ (مش null) لو اتسأل بـid مش ObjectId صالح، والـid غالباً
 * جاي من الرابط، فبنفحصه الأول ونعامل الغلط كإنه مش موجود.
 */
export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export const objectIdSchema = z.string().refine(isObjectId, 'Invalid id');
