import type { NextFunction, Request, Response } from 'express';
import { WaslaAuthError } from './auth.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
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
  res.status(500).json({ message: 'Internal server error' });
}
