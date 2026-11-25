import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { buildHealthPayload } from './src/health.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Serves a health payload at /health and /health.json during `dev` and
 * `preview`, and writes dist/health.json during `build`.
 */
function healthPlugin() {
  let mode = 'development';
  const payload = () => buildHealthPayload({ name: pkg.name, version: pkg.version, mode });

  return {
    name: 'arcade-health',
    configResolved(config) {
      mode = config.mode;
    },
    configureServer(server) {
      const body = JSON.stringify(payload(), null, 2);
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/health' && req.url !== '/health.json') return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });
    },
    configurePreviewServer(server) {
      // dist/health.json is a static file here; just alias /health to it.
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/health') req.url = '/health.json';
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'health.json',
        source: JSON.stringify(payload(), null, 2) + '\n',
      });
    },
  };
}

export default defineConfig({
  plugins: [healthPlugin()],
  test: {
    include: ['tests/**/*.test.js'],
  },
});
