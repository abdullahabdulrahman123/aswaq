import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { clientErrorSchema } from '../schemas/error.schema.js';
import { logError } from '../services/errorLog.service.js';

/**
 * POST /api/errors — المتصفح بيبعت الخطأ اللي حصل عنده: صفحة «حصلت مشكلة»، أو
 * خطأ ملوش حد يمسكه. من غير توكن، لأن الخطأ ممكن يحصل قبل الدخول. وعليه حد
 * لكل IP عشان محدش يملا السجل.
 */
const router = Router();

const reportLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

router.post('/', reportLimit, async (req, res) => {
  const parsed = clientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' });
    return;
  }
  await logError({ source: 'client', ...parsed.data, userAgent: req.get('user-agent') ?? null });
  res.status(204).end();
});

export default router;
