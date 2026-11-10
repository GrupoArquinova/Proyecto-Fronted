import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Basta con un medio de contacto: teléfono o correo. Se aplica al grupo del formulario. */
export function alMenosUnMedioDeContacto(grupo: AbstractControl): ValidationErrors | null {
  const telefono = String(grupo.get('telefono')?.value ?? '').trim();
  const correo = String(grupo.get('correo')?.value ?? '').trim();
  return telefono || correo ? null : { sinMedioDeContacto: true };
}

const ETIQUETAS: Record<string, { singular: string; plural: string }> = {
  NUEVO: { singular: 'Nuevo', plural: 'Nuevas' },
  EN_GESTION: { singular: 'En gestión', plural: 'En gestión' },
  CERRADO: { singular: 'Cerrado', plural: 'Cerradas' },
  // Estados de versiones anteriores (por si alguna base todavía los trae)
  NUEVA: { singular: 'Nueva', plural: 'Nuevas' },
  CONTACTADA: { singular: 'Contactada', plural: 'Contactadas' },
  EN_SEGUIMIENTO: { singular: 'En seguimiento', plural: 'En seguimiento' },
  ATENDIDA: { singular: 'Atendida', plural: 'Atendidas' },
  CERRADA: { singular: 'Cerrada', plural: 'Cerradas' }
};

function enTitulo(nombre: string): string {
  const texto = nombre.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Nombre del estado de una solicitud como se muestra en el panel ("EN_GESTION" → "En gestión"). */
export function etiquetaEstadoSolicitud(nombre: string | undefined | null): string {
  return nombre ? (ETIQUETAS[nombre.toUpperCase()]?.singular ?? enTitulo(nombre)) : '';
}

/** Igual que la anterior pero en plural, para los filtros ("CERRADO" → "Cerradas"). */
export function etiquetaEstadoSolicitudPlural(nombre: string | undefined | null): string {
  return nombre ? (ETIQUETAS[nombre.toUpperCase()]?.plural ?? enTitulo(nombre)) : '';
}

/** Clase de color del estado: "EN_GESTION" → "estado-en_gestion". */
export function claseEstadoSolicitud(nombre: string | undefined | null): string {
  return `estado-${(nombre ?? 'nuevo').toLowerCase()}`;
}
