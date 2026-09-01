import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // الموقع منشور على GitHub Pages تحت مسار /aswaq/ — في التطوير المحلي المسار جذر
  base: command === 'build' ? '/aswaq/' : '/',
  server: {
    port: 5184,
    strictPort: true,
  },
}));
