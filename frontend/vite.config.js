import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = { '/api': 'http://localhost:5000' };

export default defineConfig({
  plugins: [react()],
  server: { port: 5191, strictPort: true, proxy },
  preview: { port: 5191, strictPort: true, host: '127.0.0.1', proxy },
});
