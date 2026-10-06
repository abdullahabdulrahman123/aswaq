import { prisma } from '../config/db.js';

const cut = (text: string | null | undefined, max: number) => (text ? text.slice(0, max) : null);

export interface ErrorEntry {
  source: 'server' | 'client';
  message: string;
  stack?: string | null;
  where?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  version?: string | null;
}

/** بيحفظ الخطأ في error_logs — ومبيرميش أبداً: السجل ميوقّعش الطلب اللي بيسجّله */
export async function logError(entry: ErrorEntry): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        source: entry.source,
        message: cut(entry.message, 1000) || '(من غير رسالة)',
        stack: cut(entry.stack, 8000),
        where: cut(entry.where, 500),
        userAgent: cut(entry.userAgent, 300),
        userId: cut(entry.userId, 60),
        version: cut(entry.version, 60),
      },
    });
  } catch (err) {
    console.error('Error log failed', err);
  }
}
