import type { Request, Response } from 'express';
import { findManagedBusiness } from '../middleware/auth.js';
import { PERMISSIONS, can } from '../services/permissions.js';
import { refreshMetrics } from '../services/metrics.service.js';

/**
 * GET /api/businesses/:accountId/metrics — «مؤشرات المبيعات» (مكالمة ٦ أكتوبر): صف النهارده
 * بعد ما يتحسب من الأوردرات — المحققة وفي الطريق والمستقبلية، ولكل مقر. لصاحب النشاط
 * وللموظف اللي معاه «مؤشرات المبيعات» (403 فيه اسمها من غيرها). معدلات البيع (sr7…)
 * فاضية لحد ما حسابها يتحدد.
 */
export async function get(req: Request, res: Response) {
  // الصلاحية مش في النسخة المحفوظة من وصلة (دقيقة): بنسألها تاني قبل ما نرفض — صاحب الشركة ممكن يكون فاتحها من ثواني
  const allowed = can(req.business, PERMISSIONS.salesMetrics) || (await findManagedBusiness(req, req.business!.accountId, (b) => can(b, PERMISSIONS.salesMetrics)));
  if (!allowed) {
    res.status(403).json({ message: 'Permission required', permission: PERMISSIONS.salesMetrics });
    return;
  }
  const row = await refreshMetrics(req.business!.accountId);
  res.json({
    metrics: {
      date: row.date,
      achieved: row.achieved,
      inProcess: row.inProcess,
      future: row.future,
      premises: row.premises,
      sr7: row.sr7 ?? null,
      sr30: row.sr30 ?? null,
      sr91: row.sr91 ?? null,
      sr182: row.sr182 ?? null,
      sr365: row.sr365 ?? null,
      updatedAt: row.updatedAt,
    },
  });
}
