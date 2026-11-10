/**
 * El servidor de desarrollo compila cada página la primera vez que se visita, y la del proyecto es la más pesada:
 * si la primera prueba que la toca tiene que esperar esa compilación, a veces agota el tiempo. Antes de empezar se
 * pide una vez cada página principal para que ya esté compilada. Si alguna falla no importa: es solo calentamiento.
 */
export default async function calentarServidor(): Promise<void> {
  const base = 'http://localhost:4300';
  const rutas = ['/', '/proyectos', '/proyectos/6/bienvenida', '/proyectos/6/casa-modelo', '/proyectos/6/ubicacion'];
  for (const ruta of rutas) {
    try {
      await fetch(`${base}${ruta}`, { signal: AbortSignal.timeout(180_000) });
    } catch {
      // se ignora
    }
  }
}
