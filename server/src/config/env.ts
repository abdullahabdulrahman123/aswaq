import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5100),
  /** MongoDB Atlas — قاعدة aswaq */
  databaseUrl: required('MONGODB_URL'),
  /** سيرفر وصلة. أسواق بيسأله عن هوية المستخدم وأنشطته */
  waslaApiOrigin: (process.env.WASLA_API_ORIGIN ?? 'http://localhost:5000').replace(/\/+$/, ''),
  /** أصول واجهة أسواق المسموح لها تنادي الـAPI من المتصفح */
  clientOrigins: (process.env.CLIENT_ORIGINS ?? 'http://localhost:5184')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** خلف بروكسي HTTPS (Render) */
  trustProxy: process.env.TRUST_PROXY === 'true',
};
