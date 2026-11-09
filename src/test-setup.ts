// Se ejecuta antes de las pruebas unitarias. Ninguna prueba debe hablar con un backend real (por ejemplo el que
// pueda estar encendido en localhost:8080): la analítica usa fetch, así que se reemplaza por una respuesta vacía.
// Las pruebas que revisan lo que se envía lo vuelven a reemplazar con vi.stubGlobal('fetch', ...).
globalThis.fetch = (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch;

// El idioma elegido se recuerda en localStorage y <html lang>: una prueba que pase a inglés no debe dejar el sitio en inglés
// para las que corren después en el mismo proceso (con ~1400 pruebas aparecía como fallos intermitentes).
beforeEach(() => {
  try { localStorage.clear(); } catch { /* almacenamiento no disponible */ }
  document.documentElement.lang = 'es';
});

// El primer test de cada archivo compila componentes grandes; con muchos archivos a la vez 5 s a veces no alcanzan.
vi.setConfig({ testTimeout: 20000 });
