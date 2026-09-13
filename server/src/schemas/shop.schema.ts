import { z } from 'zod';
import { objectIdSchema } from './common.js';

export const shopSchema = z.object({
  name: z.string().trim().min(1).max(80),
  addressId: objectIdSchema.nullable().default(null),
});

export type ShopInput = z.infer<typeof shopSchema>;
