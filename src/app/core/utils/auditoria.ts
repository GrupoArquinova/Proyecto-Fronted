export type ClaseAccion = 'crear' | 'editar' | 'eliminar' | 'sesion' | 'otra';

const quitarTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Tipo de acción según cómo empieza su nombre ("CREAR_USUARIO" → crear), para el color del distintivo. */
export function claseDeAccion(accion: string): ClaseAccion {
  const a = quitarTildes(accion ?? '').toUpperCase();
  if (/^(CREAR|CREATE|REGISTRAR|ALTA|AGREGAR|SUBIR)/.test(a)) return 'crear';
  if (/^(ACTUALIZAR|UPDATE|EDITAR|MODIFICAR|CAMBIAR|PUBLICAR|DESPUBLICAR|ACTIVAR|REORDENAR|MARCAR|RESTABLECER)/.test(a)) return 'editar';
  if (/^(ELIMINAR|DELETE|BORRAR|DESACTIVAR|QUITAR)/.test(a)) return 'eliminar';
  if (/^(LOGIN|LOGOUT|INICIO|CIERRE|INICIAR|CERRAR|RECUPERAR|SESION)/.test(a)) return 'sesion';
  return 'otra';
}

/** Pantalla del panel donde se gestiona cada entidad (o null si no se conoce una). */
const PANTALLAS: [RegExp, string][] = [
  [/^USUARIO/, '/admin/usuarios'],
  [/^PROYECTO/, '/admin/proyectos'],
  [/^ETAPA/, '/admin/etapas'],
  [/^LOTE/, '/admin/lotes'],
  [/^ZONA/, '/admin/zonas-comunes'],
  [/^CASA/, '/admin/casas-modelo'],
  [/^MULTIMEDIA|^RECURSO/, '/admin/multimedia'],
  [/^UBICACION|^PUNTO/, '/admin/ubicaciones'],
  [/^SOLICITUD/, '/admin/solicitudes'],
  [/^CONTENIDO/, '/admin/contenido-institucional']
];

export function rutaDeEntidad(entidad: string): string | null {
  const e = quitarTildes(entidad ?? '').toUpperCase();
  return PANTALLAS.find(([patron]) => patron.test(e))?.[1] ?? null;
}
