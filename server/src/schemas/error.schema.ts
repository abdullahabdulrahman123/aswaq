import { z } from 'zod';

/** خطأ من المتصفح (POST /api/errors) — الحدود واسعة، والسجل بيقص الزيادة */
export const clientErrorSchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(20000).optional(),
  /** الصفحة اللي حصل فيها */
  where: z.string().max(1000).optional(),
  userId: z.string().max(100).optional(),
  version: z.string().max(100).optional(),
});
