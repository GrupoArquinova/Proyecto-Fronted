import { defineConfig, devices } from '@playwright/test';

/** Comprueba en un navegador real que la CSP de vercel.json no bloquea nada del sitio. `npm run e2e:csp` */
export default defineConfig({
  testDir: './e2e-csp',
  testMatch: '**/*.e2e.ts',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: { locale: 'es-CO', viewport: { width: 1440, height: 900 } },
  projects: [{ name: 'edge', use: { ...devices['Desktop Edge'], channel: process.env['PLAYWRIGHT_CANAL'] || 'msedge', viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'node e2e-csp/servidor-vercel.cjs 4400', url: 'http://localhost:4400', reuseExistingServer: true, timeout: 30_000 }
});
