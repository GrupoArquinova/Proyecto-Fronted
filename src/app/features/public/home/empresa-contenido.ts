/**
 * Contenido institucional de Grupo Arquinova S.A.S. para la página de inicio.
 * Fuente: "Respuesta al levantamiento de requisitos web" entregado por la empresa (7 de octubre de 2026).
 *
 * No agregar aquí cifras, años de experiencia, licencias ni certificaciones: la empresa pidió publicarlas solo
 * con soporte aprobado. La misión, la visión y los valores siguen como "propuestos" hasta que la empresa los
 * apruebe, por eso todavía no se muestran.
 */
export interface Servicio {
  titulo: string;
  descripcion: string;
}

export const EMPRESA_INFO = {
  nombre: 'Grupo Arquinova S.A.S.',
  nit: '901.397.504-2',
  ciudad: 'Armenia, Quindío, Colombia',
  oficina: 'Carrera 14 #48N-58, Armenia, Quindío',
  /** Texto "Quiénes somos" propuesto por la empresa como texto institucional. */
  quienesSomos: [
    'Somos una empresa con sede en Armenia que coordina servicios de arquitectura, ingeniería y gestión de proyectos. '
      + 'Acompañamos la estructuración de desarrollos mediante estudios técnicos, diseños urbanísticos, arquitectónicos '
      + 'y estructurales, y la preparación y gestión de trámites ante las entidades competentes.',
    'Nuestro trabajo incluye proyectos residenciales, rurales y turísticos en el Quindío.'
  ]
};

export const SERVICIOS: Servicio[] = [
  {
    titulo: 'Estudios de viabilidad',
    descripcion: 'Estudios de viabilidad e implantación de proyectos y revisión de condiciones urbanísticas.'
  },
  {
    titulo: 'Diseño urbanístico y arquitectónico',
    descripcion: 'Diseño urbanístico y arquitectónico de parcelaciones, villas y edificaciones.'
  },
  {
    titulo: 'Diseño estructural y estudios técnicos',
    descripcion: 'Diseño estructural y coordinación de estudios de suelos y levantamientos topográficos.'
  },
  {
    titulo: 'Licencias y permisos',
    descripcion: 'Preparación de expedientes y gestión de licencias urbanísticas y permisos ambientales dentro del alcance contratado.'
  },
  {
    titulo: 'Servicios públicos y aguas residuales',
    descripcion: 'Gestión de disponibilidades de servicios públicos y diseño de soluciones de tratamiento de aguas residuales.'
  },
  {
    titulo: 'Planos y propiedad horizontal',
    descripcion: 'Elaboración de planos y coordinación del reglamento de propiedad horizontal.'
  },
  {
    titulo: 'Estructuración técnica y presupuesto',
    descripcion: 'Estructuración técnica y presupuestación de proyectos.'
  }
];
