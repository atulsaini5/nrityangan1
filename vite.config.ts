import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This polyfills process.env.API_KEY so your existing code works without changes
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});