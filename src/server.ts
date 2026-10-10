import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import documentosLegales from './app/features/public/legal/legal-contenido.json';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Dirección del sitio: SITE_URL (producción), el dominio configurado en el entorno o, si no hay ninguno, el de la petición.
 */
function urlDelSitio(req: express.Request): string {
  const configurada = (process.env['SITE_URL'] || environment.sitioUrl || '').replace(/\/+$/, '');
  if (configurada) return configurada;
  const protocolo = String(req.headers['x-forwarded-proto'] ?? req.protocol).split(',')[0];
  const host = String(req.headers['x-forwarded-host'] ?? req.get('host')).split(',')[0];
  return `${protocolo}://${host}`;
}

const escaparXml = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** robots.txt: deja indexar el sitio público, cierra el panel e indica dónde está el mapa del sitio. */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /login',
      'Disallow: /recuperar-password',
      'Disallow: /reset-password',
      '',
      `Sitemap: ${urlDelSitio(req)}/sitemap.xml`,
      ''
    ].join('\n')
  );
});

/** Mapa del sitio: páginas fijas y los proyectos publicados (se consultan al backend; se guarda 10 minutos). */
let rutasProyectos: { rutas: string[]; hasta: number } = { rutas: [], hasta: 0 };

async function rutasDeProyectos(): Promise<string[]> {
  if (Date.now() < rutasProyectos.hasta) return rutasProyectos.rutas;
  try {
    const respuesta = await fetch(`${environment.apiUrl}/proyectos?soloPublicados=true`, { signal: AbortSignal.timeout(5000) });
    const proyectos = (await respuesta.json()) as { id: number }[];
    rutasProyectos = { rutas: proyectos.map((p) => `/proyectos/${p.id}/bienvenida`), hasta: Date.now() + 10 * 60 * 1000 };
  } catch {
    // Sin backend el mapa sale solo con las páginas fijas; se vuelve a intentar pronto
    rutasProyectos = { rutas: rutasProyectos.rutas, hasta: Date.now() + 60 * 1000 };
  }
  return rutasProyectos.rutas;
}

app.get('/sitemap.xml', async (req, res) => {
  const base = urlDelSitio(req);
  const fijas = ['/', '/proyectos', ...Object.keys(documentosLegales).map((slug) => `/legal/${slug}`)];
  const rutas = [...fijas, ...(await rutasDeProyectos())];
  const urls = rutas.map((ruta) => `  <url><loc>${escaparXml(base + ruta)}</loc></url>`).join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
