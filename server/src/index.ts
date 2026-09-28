import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { attachRealtime } from './realtime.js';
import { linkStoreCopiesToSources } from './services/item.service.js';

// سيرفر http واحد للـAPI والـsocket.io (الطلبات الواردة لحظة بلحظة) على نفس البورت
const server = createServer(createApp());
attachRealtime(server);

linkStoreCopiesToSources()
  .then((n) => n > 0 && console.log(`Linked ${n} store item copies to their source items`))
  .catch((err) => console.error('Linking store item copies failed', err));

server.listen(env.port, () => {
  console.log(`Aswaq API listening on http://localhost:${env.port}`);
});
