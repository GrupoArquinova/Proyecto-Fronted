import { environment } from '../../../environments/environment';

/** Logo de la empresa (el mismo del panel); sirve como imagen para compartir cuando una página no tiene otra. */
export const LOGO_URL = 'https://res.cloudinary.com/dn3s7utod/image/upload/v1790258444/logo-Arquinova_dgkosg.jpg';

/**
 * Imagen para WhatsApp, Facebook, LinkedIn y X cuando la página no tiene una propia: el logo centrado sobre fondo blanco en
 * 1200×630 (la proporción 1,91:1 que piden las redes), generado por Cloudinary. Es la misma dirección que lleva index.html.
 */
export const IMAGEN_COMPARTIR_URL = 'https://res.cloudinary.com/dn3s7utod/image/upload/c_pad,w_1200,h_630,b_rgb:FFFFFF,f_jpg,q_auto/v1790258444/logo-Arquinova_dgkosg.jpg';

/** Datos fijos de la empresa (los mismos de EMPRESA_INFO de la página de inicio; una prueba comprueba que coincidan). */
export const DATOS_EMPRESA = {
  nombre: 'Grupo Arquinova S.A.S.',
  nit: '901.397.504-2',
  oficina: 'Carrera 14 #48N-58, Armenia, Quindío'
};

type JsonLd = Record<string, unknown>;

/** Quita las claves sin valor: schema.org no quiere propiedades vacías. */
function limpiar<T extends JsonLd>(obj: T): T {
  for (const clave of Object.keys(obj)) {
    const v = obj[clave];
    if (v === undefined || v === null || v === '') delete obj[clave];
  }
  return obj;
}

const unir = (base: string | null, ruta: string) => (base ? `${base}${ruta}` : undefined);

/** Datos de la organización (nombre, dirección, contacto y logo). Solo lleva datos reales de la empresa. */
export function organizacionJsonLd(base: string | null): JsonLd {
  return limpiar({
    '@type': 'Organization',
    '@id': unir(base, '/#organizacion') ?? '#organizacion',
    name: DATOS_EMPRESA.nombre,
    legalName: DATOS_EMPRESA.nombre,
    taxID: DATOS_EMPRESA.nit,
    url: unir(base, '/'),
    logo: LOGO_URL,
    email: environment.contacto.correo,
    telephone: environment.contacto.telefonoTexto,
    address: {
      '@type': 'PostalAddress',
      streetAddress: DATOS_EMPRESA.oficina,
      addressLocality: 'Armenia',
      addressRegion: 'Quindío',
      addressCountry: 'CO'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: environment.contacto.telefonoTexto,
      email: environment.contacto.correo,
      areaServed: 'CO',
      availableLanguage: ['es', 'en']
    }
  });
}

/** Esquema de la página de inicio: la organización, con el contexto de schema.org. */
export function inicioJsonLd(base: string | null): JsonLd {
  return { '@context': 'https://schema.org', ...organizacionJsonLd(base) };
}

export interface MigaPan {
  nombre: string;
  /** Ruta de la página ("/proyectos"); la última (la página actual) puede ir sin ella. */
  ruta?: string;
}

export function migasJsonLd(base: string | null, migas: MigaPan[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    '@id': unir(base, '#migas') ?? '#migas',
    itemListElement: migas.map((m, i) =>
      limpiar({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: m.ruta ? unir(base, m.ruta) : undefined })
    )
  };
}

export interface DatosProyectoJsonLd {
  base: string | null;
  /** Ruta de la página que se está viendo ("/proyectos/6/bienvenida"). */
  ruta: string;
  idioma: 'es' | 'en';
  nombre: string;
  descripcion: string;
  imagen: string | null;
  tipoProyecto?: string | null;
  ofertaComercial: boolean;
  ciudad?: string | null;
  departamento?: string | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  migas: MigaPan[];
}

/**
 * Datos estructurados de la página de un proyecto: la organización, el lugar del proyecto (con su ubicación real), la
 * página (en las ofertas comerciales, un anuncio inmobiliario) y las migas de pan. No lleva precios ni ofertas: solo datos
 * que están cargados en el sistema.
 */
export function proyectoJsonLd(d: DatosProyectoJsonLd): JsonLd {
  const { base } = d;
  const lugar = limpiar({
    '@type': d.tipoProyecto === 'RESIDENCIAL' ? 'Residence' : 'Place',
    '@id': unir(base, `${d.ruta.replace(/\/[^/]*$/, '')}#proyecto`) ?? '#proyecto',
    name: d.nombre,
    description: d.descripcion,
    image: d.imagen ?? undefined,
    url: unir(base, d.ruta),
    address: d.ciudad
      ? limpiar({ '@type': 'PostalAddress', addressLocality: d.ciudad, addressRegion: d.departamento ?? undefined, addressCountry: 'CO' })
      : undefined,
    geo:
      d.latitud != null && d.longitud != null && Number.isFinite(Number(d.latitud)) && Number.isFinite(Number(d.longitud))
        ? { '@type': 'GeoCoordinates', latitude: Number(d.latitud), longitude: Number(d.longitud) }
        : undefined
  });
  const organizacion = organizacionJsonLd(base);
  const idOrganizacion = organizacion['@id'] as string;
  const pagina = limpiar({
    '@type': d.ofertaComercial ? 'RealEstateListing' : 'WebPage',
    '@id': unir(base, `${d.ruta}#pagina`) ?? '#pagina',
    url: unir(base, d.ruta),
    name: d.nombre,
    description: d.descripcion,
    inLanguage: d.idioma,
    primaryImageOfPage: d.imagen ? { '@type': 'ImageObject', url: d.imagen } : undefined,
    about: { '@id': lugar['@id'] },
    publisher: { '@id': idOrganizacion },
    breadcrumb: { '@id': (unir(base, '#migas') ?? '#migas') }
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [organizacion, lugar, pagina, migasJsonLd(base, d.migas)]
  };
}
