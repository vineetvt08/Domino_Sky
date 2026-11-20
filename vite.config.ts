import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { handleDispatchApi } from './server/apiHandler';

// Load environment variables (.env)
dotenv.config();

function dispatchApiPlugin(): Plugin {
  return {
    name: 'domino-sky-dispatch-api',
    configureServer(server) {
      server.middlewares.use('/api/dispatch', (req, res) => {
        handleDispatchApi(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/dispatch', (req, res) => {
        handleDispatchApi(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dispatchApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
