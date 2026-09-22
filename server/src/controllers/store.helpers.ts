import type { Request, Response } from 'express';
import { findManagedBusiness } from '../middleware/auth.js';
import { isObjectId } from '../schemas/common.js';

/**
 * المتاجر عايشة في وصلة مش هنا، فبنتأكد إن الـid ده مقر من مقرات النشاط ده
 * ومعلّم عليه «متجر». بيرجّع null بعد ما يرد بـ404.
 *
 * 404 مش 400: الرد ميقولش لحد إن المقر ده موجود عند نشاط تاني.
 */
export async function ensureStore(req: Request, res: Response): Promise<string | null> {
  const shopId = String(req.params.shopId);
  const business = isObjectId(shopId)
    ? await findManagedBusiness(req, req.business!.accountId, (b) =>
        (b.premises ?? []).some((premises) => premises.id === shopId && premises.isStore),
      )
    : undefined;

  if (!business) {
    res.status(404).json({ message: 'Store not found in this business' });
    return null;
  }
  return shopId;
}
