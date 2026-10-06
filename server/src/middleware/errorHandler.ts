import type { NextFunction, Request, Response } from 'express';
import { WaslaAuthError } from './auth.js';
import { logError } from '../services/errorLog.service.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof WaslaAuthError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  // JSON مكسور في الطلب — غلطة من اللي باعت مش من السيرفر
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Malformed JSON' });
    return;
  }
  console.error(err);
  // بيتحفظ كمان في error_logs (npm run errors) — مش في لوج Northflank بس
  void logError({
    source: 'server',
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : null,
    where: `${req.method} ${req.baseUrl}${req.path}`,
  });
  res.status(500).json({ message: 'Internal server error' });
}
