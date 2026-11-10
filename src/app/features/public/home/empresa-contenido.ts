/**
 * Contenido institucional de Grupo Arquinova S.A.S. para la página de inicio.
 * Fuente: "Respuesta al levantamiento de requisitos web" entregado por la empresa (7 de octubre de 2026).
 *
 * No agregar aquí cifras, años de experiencia, licencias ni certificaciones: la empresa pidió publicarlas solo
 * con soporte aprobado. La misión, la visión y los valores siguen como "propuestos" hasta que la empresa los
 * apruebe, por eso todavía no se muestran.
 */
export interface Servicio {
  /** Clave del texto en las traducciones (home.servicios.lista.<clave>). */
  clave: string;
  /** Nombre en español: es lo que se guarda en la solicitud, para que el equipo siempre lo lea en el mismo idioma. */
  titulo: string;
}

/** Datos que no cambian con el idioma. Los textos ("Quiénes somos", etc.) están en i18n/es.json y i18n/en.json. */
export const EMPRESA_INFO = {
  nombre: 'Grupo Arquinova S.A.S.',
  nit: '901.397.504-2',
  ciudad: 'Armenia, Quindío, Colombia',
  oficina: 'Carrera 14 #48N-58, Armenia, Quindío'
};

export const SERVICIOS: Servicio[] = [
  { clave: 'viabilidad', titulo: 'Estudios de viabilidad' },
  { clave: 'diseno', titulo: 'Diseño urbanístico y arquitectónico' },
  { clave: 'estructural', titulo: 'Diseño estructural y estudios técnicos' },
  { clave: 'licencias', titulo: 'Licencias y permisos' },
  { clave: 'servicios-publicos', titulo: 'Servicios públicos y aguas residuales' },
  { clave: 'planos', titulo: 'Planos y propiedad horizontal' },
  { clave: 'presupuesto', titulo: 'Estructuración técnica y presupuesto' }
];
