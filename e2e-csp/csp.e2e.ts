import { expect, test } from '@playwright/test';
import { simularBackend, PROYECTO_ID } from '../e2e/datos-simulados';

// Recorre el sitio ya compilado para Vercel, servido con las cabeceras de vercel.json, y falla si el navegador bloquea algo por la CSP.
// Se corre con:  npm run e2e:csp   (compila antes con `ng build --configuration vercel`).
// Si cambia el dominio del backend o se agrega un servicio externo (videos, mapas), hay que actualizar la CSP en vercel.json.
test.use({ baseURL: 'http://localhost:4400' });

const RUTAS = [`/proyectos/6/ubicacion?vista=mapa`, `/proyectos/6/ubicacion?vista=google-maps`, `/proyectos/6/ubicacion?vista=vista-aerea`, `/proyectos/6/ubicacion?vista=entorno-360`, '/', '/proyectos', '/legal/politica-datos', `/proyectos/${PROYECTO_ID}/bienvenida`, `/proyectos/${PROYECTO_ID}/ubicacion`,
  `/proyectos/${PROYECTO_ID}/zonas-comunes`, `/proyectos/${PROYECTO_ID}/casa-modelo?vista=imagenes`, `/proyectos/${PROYECTO_ID}/contacto`, '/login'];

test('el sitio funciona con la CSP de Vercel: nada bloqueado', async ({ page }) => {
  // El build de Vercel habla con el backend de Render: se simula ese servidor con los datos de prueba
  await simularBackend(page, 'https://arquinova-backend.onrender.com');
  // Una ubicación con mapa interactivo (OpenStreetMap), recorrido 360 (foto en Cloudinary) y un tour de Matterport
  await page.route('https://arquinova-backend.onrender.com/api/ubicaciones/proyecto/*', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ proyectoId: PROYECTO_ID, ciudad: 'La Tebaida', departamento: 'Quindío', latitud: 4.45, longitud: -75.78,
      recorrido360Url: 'https://res.cloudinary.com/demo/image/upload/panorama.jpg', vistaAereaUrl: 'https://my.matterport.com/show/?m=abc123' })
  }));
  await page.route('https://res.cloudinary.com/**', route => route.fulfill({ status: 200, contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') }));
  await page.route(/https:\/\/(www\.openstreetmap\.org|my\.matterport\.com)\/.*/, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
  const bloqueos: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      (window as any).__csp = ((window as any).__csp || []).concat(`${e.violatedDirective} → ${e.blockedURI}`);
    });
  });
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) bloqueos.push(m.text().slice(0, 220)); });

  for (const ruta of RUTAS) {
    await page.goto(ruta);
    await page.waitForTimeout(900);
    const violaciones: string[] = await page.evaluate(() => (window as any).__csp || []);
    // Las imágenes simuladas (imagenes.prueba) y el backend simulado se interceptan en la red, no son bloqueos de la CSP
    violaciones.forEach(v => bloqueos.push(`${ruta}: ${v}`));
  }

  // La hoja de estilos principal quedó aplicada (sin onload en línea): el fondo del cuerpo viene de styles.css
  await page.goto('/');
  const aplicada = await page.evaluate(() => [...document.styleSheets].some(h => (h.href || '').includes('styles-')));
  expect(aplicada, 'styles.css cargada').toBe(true);

  const reales = [...bloqueos];
  // Control: la CSP SÍ bloquea un script en línea (si esto no se detectara, la prueba de arriba no probaría nada)
  await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__x=1'; document.head.appendChild(s); });
  await page.waitForTimeout(200);
  const control: string[] = await page.evaluate(() => (window as any).__csp || []);
  expect(control.some(v => v.startsWith('script-src'))).toBe(true);
  await page.goto(`/proyectos/${PROYECTO_ID}/ubicacion`);
  await page.waitForTimeout(1200);
  await page.goto(`/proyectos/${PROYECTO_ID}/ubicacion?vista=mapa`);
  await page.waitForTimeout(1200);
  expect(await page.locator('iframe').count(), 'el mapa de OpenStreetMap se incrusta').toBe(1);

  expect(reales, 'Bloqueos de la CSP').toEqual([]);
});
