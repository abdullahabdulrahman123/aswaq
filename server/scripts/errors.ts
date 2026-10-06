/**
 * آخر الأخطاء المتسجّلة في error_logs (فحص ٦ أكتوبر) — الأقدم فوق والأحدث تحت.
 *
 *   npm run errors          آخر ٣٠
 *   npm run errors -- 100   آخر ١٠٠
 *
 * بيقرا القاعدة اللي في .env — يعني الحقيقية.
 */
import 'dotenv/config';
import { prisma } from '../src/config/db.js';

const count = Number(process.argv[2] ?? 30) || 30;

try {
  const rows = await prisma.errorLog.findMany({ orderBy: { at: 'desc' }, take: count });
  if (rows.length === 0) console.log('مفيش أخطاء متسجّلة.');
  for (const row of rows.reverse()) {
    const tags = [row.source, row.where, row.userId && `user ${row.userId}`, row.version && `v ${row.version}`].filter(Boolean);
    console.log(`${row.at.toISOString()}  ${tags.join('  ')}`);
    console.log(`  ${row.message}`);
    if (row.stack) console.log(row.stack.split('\n').slice(0, 4).map((line) => `    ${line.trim()}`).join('\n'));
    if (row.userAgent) console.log(`    ${row.userAgent}`);
  }
} finally {
  await prisma.$disconnect();
}
