import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // load .env.local and other env files
  const env = loadEnv(mode, '.', '');

  const GEMINI_KEY =
    env.VITE_GEMINI_API_KEY || // recommended
    env.GEMINI_API_KEY ||      // fallback
    '';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    define: {
      // VITE format (recommended)
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),

      // fallback for code that uses older names
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),
      'process.env.API_KEY': JSON.stringify(GEMINI_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
