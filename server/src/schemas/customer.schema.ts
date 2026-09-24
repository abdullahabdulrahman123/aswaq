import { z } from 'zod';

/** عميل جديد من نافذة «مبيعات». الموبايل أرقام إنجليزي بس، والواجهة بتنضّفه قبل ما تبعته */
export const customerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{0,15}$/)
    .default(''),
  isTrader: z.boolean().default(false),
});

export type CustomerInput = z.infer<typeof customerSchema>;
