import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  /*
   * الموقع منشور على GitHub Pages تحت مسار /aswaq/ — في التطوير المحلي المسار جذر.
   * `vite preview` بيعرض النسخة المبنية نفسها، فلازم نفس المسار بتاع النشر،
   * وإلا الملفات بترجع صفحة HTML بدل الـJS والـmanifest.
   */
  base: command === 'build' || isPreview ? '/aswaq/' : '/',
  server: {
    port: 5184,
    strictPort: true,
  },
}));
