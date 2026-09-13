/*
 * service worker بتاع أسواق — مبيخزّنش أي حاجة.
 *
 * وجوده بـfetch handler حقيقي بيخلي المتصفحات (خصوصاً القديمة على أندرويد)
 * تعتبر الموقع قابل للتثبيت وتسمح بإشعار «ثبّت أسواق».
 *
 * مفيش كاش عن قصد: الموقع بيتحدّث مع كل نشر، وكاش غلط كان هيخلي الناس
 * تفضل شايفة نسخة قديمة من غير ما يعرفوا.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// فتح الصفحات بس بيعدّي من هنا وبيروح للشبكة زي ما هو.
// الصور والـAPI والخطوط مبنلمسهاش خالص.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request));
});
