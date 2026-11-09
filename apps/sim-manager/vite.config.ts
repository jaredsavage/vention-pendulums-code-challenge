import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keeps Vite from creating a node_modules folder inside the app.
  cacheDir: '../../node_modules/.vite/sim-manager',
  publicDir: false,
});
