import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Modo de renderizado por ruta:
 * - Paginas publicas (inicio, proyectos): se renderizan en el servidor en cada visita,
 *   asi muestran datos actuales y son indexables por Google.
 * - Login, recuperacion de contraseña y panel /admin: solo en el navegador,
 *   porque dependen del token guardado en localStorage (no existe en el servidor).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'proyectos', renderMode: RenderMode.Server },
  { path: 'proyectos/:id', renderMode: RenderMode.Server },
  { path: 'proyectos/:id/**', renderMode: RenderMode.Server },

  { path: 'login', renderMode: RenderMode.Client },
  { path: 'recuperar-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Server }
];
