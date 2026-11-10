/** Roles del panel de administración. Viajan en el token (claim "roles", por ejemplo "ROLE_COMERCIAL"). */
export type Rol = 'ADMINISTRADOR' | 'COMERCIAL' | 'EDITOR';

export const ROLES_PANEL: readonly Rol[] = ['ADMINISTRADOR', 'COMERCIAL', 'EDITOR'];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES_PANEL as readonly string[]).includes(valor);
}

export interface InfoRol {
  valor: Rol;
  /** Nombre legible para el chip del navbar y las listas. */
  nombre: string;
  /** Versión corta para el chip del navbar. */
  corto: string;
  /** Qué puede hacer, en una frase (se muestra junto al selector de rol). */
  descripcion: string;
}

export const INFO_ROLES: readonly InfoRol[] = [
  { valor: 'ADMINISTRADOR', nombre: 'Administrador', corto: 'Admin', descripcion: 'Acceso total: contenido, solicitudes, métricas, usuarios e historial de cambios.' },
  { valor: 'COMERCIAL', nombre: 'Comercial', corto: 'Comercial', descripcion: 'Atiende las solicitudes de contacto y consulta las métricas (solo lectura).' },
  { valor: 'EDITOR', nombre: 'Editor de contenido', corto: 'Editor', descripcion: 'Edita proyectos, ubicaciones, tipologías, amenidades, etapas, lotes, multimedia y contenido institucional.' }
];

export function infoDeRol(rol: Rol | null | undefined): InfoRol | undefined {
  return INFO_ROLES.find(r => r.valor === rol);
}

/** Etiqueta corta de los roles de la sesión para el navbar; "Admin" si el token no trae ninguno reconocible. */
export function etiquetaDeRoles(roles: readonly Rol[]): string {
  return roles.length ? roles.map(r => infoDeRol(r)?.corto ?? r).join(', ') : 'Admin';
}

const TODOS: readonly Rol[] = ['ADMINISTRADOR'];
const CONTENIDO: readonly Rol[] = ['ADMINISTRADOR', 'EDITOR'];
const COMERCIAL: readonly Rol[] = ['ADMINISTRADOR', 'COMERCIAL'];

/**
 * Quién puede entrar a cada sección del panel (primer tramo de la ruta tras /admin).
 * Es para la experiencia de la persona: el backend vuelve a comprobar el rol en cada petición.
 */
export const PERMISOS_PANEL: Readonly<Record<string, readonly Rol[]>> = {
  resumen: TODOS,
  metricas: COMERCIAL,
  proyectos: CONTENIDO,
  etapas: CONTENIDO,
  lotes: CONTENIDO,
  'zonas-comunes': CONTENIDO,
  'casas-modelo': CONTENIDO,
  multimedia: CONTENIDO,
  ubicaciones: CONTENIDO,
  'contenido-institucional': CONTENIDO,
  solicitudes: COMERCIAL,
  usuarios: TODOS,
  historial: TODOS,
  reportes: TODOS
};

/** Pantalla con la que arranca el panel según el rol (la primera que tiene permitida). */
const INICIO_POR_ROL: Readonly<Record<Rol, string>> = {
  ADMINISTRADOR: 'resumen',
  COMERCIAL: 'metricas',
  EDITOR: 'proyectos'
};

/** ¿Alguno de estos roles puede entrar a la sección? */
export function puedeVerSeccion(roles: readonly Rol[], seccion: string): boolean {
  const permitidos = PERMISOS_PANEL[seccion];
  return !!permitidos && roles.some(r => permitidos.includes(r));
}

/** Ruta (sin /admin) de la pantalla de inicio para esos roles, o null si no tienen ninguno del panel. */
export function inicioDelPanel(roles: readonly Rol[]): string | null {
  for (const rol of ROLES_PANEL) {
    if (roles.includes(rol)) return INICIO_POR_ROL[rol];
  }
  return null;
}
