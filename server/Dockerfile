# سيرفر أسواق على أي استضافة بتبني Docker (Northflank حالياً) — نفس خطوات render.yaml.
FROM node:22-slim

# Prisma محتاج openssl، والصورة الـslim مش جاية بيه
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# devDependencies لازمة: TypeScript للبناء، وPrisma CLI وقت التشغيل
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 5100
# db push بيطابق فهارس MongoDB مع schema.prisma قبل ما السيرفر يقوم — زي startCommand في Render
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
