import { defineConfig, loadEnv } from 'vite';
import handler from './api/generate-message.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GROQ_');
  for (const name of ['GROQ_API_KEY', 'GROQ_MODEL']) if (env[name]) process.env[name] = env[name];
  const configure = (server) => {
    server.middlewares.use('/api/generate-message', (req, res) => { handler(req, res); });
  };
  return { plugins: [{ name: 'cri-message-api', configureServer: configure, configurePreviewServer: configure }] };
});
