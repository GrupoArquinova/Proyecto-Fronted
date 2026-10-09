import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo del sitio público. Usan datos simulados (no necesitan el backend ni la base de datos)
 * y levantan su propio servidor en el puerto 4300 para no depender del `ng serve` que ya tengas abierto.
 *
 *   npm run e2e            corre todas las pruebas
 *   npm run e2e:ui         abre el panel visual de Playwright
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Pide una vez las páginas pesadas para que el servidor de desarrollo ya las tenga compiladas
  globalSetup: './e2e/calentar-servidor.ts',
  // El servidor de desarrollo compila cada página la primera vez que se visita: se da tiempo de sobra
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Una sola prueba a la vez: todas usan el mismo servidor de desarrollo y, en paralelo, se estorban entre sí (fallos al azar)
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4300',
    viewport: { width: 1440, height: 900 },
    // El sitio toma el idioma del navegador: las pruebas se escriben para el español
    locale: 'es-CO',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npx ng serve --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
    timeout: 240_000
  }
});
