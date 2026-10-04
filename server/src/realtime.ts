import type { Server as HttpServer } from 'node:http';
import type { Order } from '@prisma/client';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { businessesForToken, userForToken } from './middleware/auth.js';

/**
 * «الطلبات الواردة» لحظة بلحظة، بطلب العميل (٢٧ سبتمبر): «احرق في الـsocket.io
 * مش في الـquery». أول ما أوردر يتأكد، كل اللي فاتح أسواق بالنشاط البائع
 * بيوصله على طول — العداد الأحمر والتنبيه وليستة الصفحة.
 *
 * الدخول بتوكن وصلة نفسه اللي الـAPI بيقبله. الواجهة بتطلب تتابع نشاط
 * («watch»)، والسيرفر بيتأكد من وصلة إن صاحب التوكن بيديره قبل ما يدخّله
 * أوضته — محدش يسمع طلبات نشاط مش بتاعه.
 *
 * البعت بيحصل ساعة التأكيد نفسه (checkout) مش بمراقبة الجدول: الأوردر مبيبقاش
 * «طلب وارد» غير من الخطوة دي، فمفيش طلب يفوت ومفيش مراقبة زيادة.
 */

let io: Server | null = null;

const room = (accountId: string) => `sellers:${accountId}`;

export function attachRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.clientOrigins }, path: '/socket.io' });

  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.data.token = token;
      socket.data.accountId = (await userForToken(token)).accountId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    /** نشاط واحد في المرة — اللي المستخدم شغال بيه في الناڤبار */
    socket.on('watch', async (accountId: unknown, ack?: (res: { ok: boolean }) => void) => {
      for (const joined of socket.rooms) if (joined.startsWith('sellers:')) await socket.leave(joined);
      if (typeof accountId !== 'string') return ack?.({ ok: false });
      try {
        const managed = await businessesForToken(socket.data.token);
        if (!managed.some((b) => b.accountId === accountId)) return ack?.({ ok: false });
        await socket.join(room(accountId));
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });
  });
}

/**
 * أوردر اتأكد: لكل اللي بيتابعوا النشاط البائع. own = هو اللي أكّده (بيعة
 * «مبيعات» من البائع نفسه) — الواجهة بتعدّه من غير ما تنبّه صاحبه.
 */
/**
 * أوردر اتنقل مرحلة، أو فاتورته المؤكدة اتعدّلت (٢ أكتوبر): «مهامي» عند كل اللي
 * بيتابعوا النشاط البائع بتتحدّث — المكتمل بيخرج منها من غير refresh.
 */
export async function announceState(order: Order) {
  io?.to(room(order.from.acc)).emit('order:state', { order });
}

export async function announceIncoming(order: Order) {
  if (!io) return;
  for (const socket of await io.in(room(order.from.acc)).fetchSockets()) {
    socket.emit('order:new', { order, own: socket.data.accountId === order.creator.acc });
  }
}
