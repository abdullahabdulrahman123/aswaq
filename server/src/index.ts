import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { attachRealtime } from './realtime.js';
import { linkStoreCopiesToSources } from './services/item.service.js';
import { backfillInvoices } from './services/ledger.service.js';
import { backfillOrderSources } from './services/order.service.js';
import { syncPermissions } from './services/permissions.js';

// سيرفر http واحد للـAPI والـsocket.io (الطلبات الواردة لحظة بلحظة) على نفس البورت
const server = createServer(createApp());
attachRealtime(server);

linkStoreCopiesToSources()
  .then((n) => n > 0 && console.log(`Linked ${n} store item copies to their source items`))
  .catch((err) => console.error('Linking store item copies failed', err));

backfillOrderSources()
  .then((n) => n > 0 && console.log(`Set the source of ${n} older orders`))
  .catch((err) => console.error('Order source backfill failed', err));

// الأوردرات اللي قبل خانة kind (رسالة العميل ٨ أكتوبر): draft / order / invoice، والفاتورة
// اللي حركتها مكانتش في الجدول الحاكم بتدخله مرة واحدة
backfillInvoices()
  .then((n) => n > 0 && console.log(`Marked ${n} older orders as invoices`))
  .catch((err) => console.error('Invoice backfill failed', err));

// رصيد الصلاحيات في الداتابيز زي الكود (مكالمة ٢ أكتوبر)
syncPermissions().catch((err) => console.error('Permissions sync failed', err));

server.listen(env.port, () => {
  console.log(`Aswaq API listening on http://localhost:${env.port}`);
});
