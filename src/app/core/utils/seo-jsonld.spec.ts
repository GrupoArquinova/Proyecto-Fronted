import { describe, expect, it } from 'vitest';
import { DATOS_EMPRESA, LOGO_URL, inicioJsonLd, migasJsonLd, organizacionJsonLd, proyectoJsonLd } from './seo-jsonld';
import { EMPRESA_INFO } from '../../features/public/home/empresa-contenido';
import { environment } from '../../../environments/environment';

const datosBase = {
  base: 'https://sitio.test',
  ruta: '/proyectos/6/bienvenida',
  idioma: 'es' as const,
  nombre: 'El Encanto',
  descripcion: 'Villas en el Quindío',
  imagen: 'https://img.test/p.jpg',
  ofertaComercial: true,
  migas: [{ nombre: 'Inicio', ruta: '/' }, { nombre: 'El Encanto' }]
};

type Nodo = Record<string, unknown>;
const grafo = (j: Record<string, unknown>) => j['@graph'] as Nodo[];

describe('JSON-LD', () => {
  it('los datos de la empresa coinciden con los de la página de inicio', () => {
    expect(DATOS_EMPRESA).toEqual({ nombre: EMPRESA_INFO.nombre, nit: EMPRESA_INFO.nit, oficina: EMPRESA_INFO.oficina });
  });

  it('la organización lleva solo datos reales de la empresa: nombre, NIT, dirección, contacto y logo', () => {
    const o = organizacionJsonLd('https://sitio.test');
    expect(o).toMatchObject({
      '@type': 'Organization',
      '@id': 'https://sitio.test/#organizacion',
      name: 'Grupo Arquinova S.A.S.',
      url: 'https://sitio.test/',
      logo: LOGO_URL,
      email: environment.contacto.correo,
      telephone: environment.contacto.telefonoTexto,
      address: { addressLocality: 'Armenia', addressCountry: 'CO' },
      contactPoint: { '@type': 'ContactPoint', areaServed: 'CO', availableLanguage: ['es', 'en'] }
    });
  });

  it('sin dominio configurado no inventa direcciones: usa identificadores locales y omite la url', () => {
    const o = organizacionJsonLd(null);
    expect(o['url']).toBeUndefined();
    expect(o['@id']).toBe('#organizacion');
  });

  it('el inicio es la organización con el contexto de schema.org', () => {
    expect(inicioJsonLd('https://sitio.test')).toMatchObject({ '@context': 'https://schema.org', '@type': 'Organization' });
  });

  it('las migas se numeran y la última puede ir sin enlace', () => {
    const m = migasJsonLd('https://sitio.test', [{ nombre: 'Inicio', ruta: '/' }, { nombre: 'Proyectos', ruta: '/proyectos' }, { nombre: 'Actual' }]);
    const items = m['itemListElement'] as Nodo[];
    expect(items.map((i) => i['position'])).toEqual([1, 2, 3]);
    expect(items[1]['item']).toBe('https://sitio.test/proyectos');
    expect(items[2]['item']).toBeUndefined();
  });

  describe('proyecto', () => {
    it('una oferta comercial es un anuncio inmobiliario sobre el lugar, publicado por la organización', () => {
      const g = grafo(proyectoJsonLd(datosBase));
      const lugar = g.find((n) => n['@type'] === 'Place')!;
      const pagina = g.find((n) => n['@type'] === 'RealEstateListing')!;
      expect(g.map((n) => n['@type'])).toEqual(['Organization', 'Place', 'RealEstateListing', 'BreadcrumbList']);
      expect(pagina['about']).toEqual({ '@id': lugar['@id'] });
      expect(pagina['publisher']).toEqual({ '@id': 'https://sitio.test/#organizacion' });
      expect(pagina['inLanguage']).toBe('es');
      expect(lugar['@id']).toBe('https://sitio.test/proyectos/6#proyecto');
    });

    it('nunca incluye precios ni ofertas', () => {
      expect(JSON.stringify(proyectoJsonLd(datosBase))).not.toMatch(/price|offers|priceCurrency/i);
    });

    it('un caso de portafolio es una página normal y uno residencial una Residence', () => {
      const g = grafo(proyectoJsonLd({ ...datosBase, ofertaComercial: false, tipoProyecto: 'RESIDENCIAL' }));
      expect(g.map((n) => n['@type'])).toEqual(['Organization', 'Residence', 'WebPage', 'BreadcrumbList']);
    });

    it('la dirección y las coordenadas salen solo si son reales', () => {
      const con = grafo(proyectoJsonLd({ ...datosBase, ciudad: 'La Tebaida', departamento: 'Quindío', latitud: '4.45', longitud: -75.78 }))[1];
      expect(con['address']).toEqual({ '@type': 'PostalAddress', addressLocality: 'La Tebaida', addressRegion: 'Quindío', addressCountry: 'CO' });
      expect(con['geo']).toEqual({ '@type': 'GeoCoordinates', latitude: 4.45, longitude: -75.78 });

      const sin = grafo(proyectoJsonLd({ ...datosBase, ciudad: '', latitud: null, longitud: 'abc' }))[1];
      expect(sin['address']).toBeUndefined();
      expect(sin['geo']).toBeUndefined();
    });

    it('sin imagen no manda image ni primaryImageOfPage', () => {
      const g = grafo(proyectoJsonLd({ ...datosBase, imagen: null }));
      expect(g[1]['image']).toBeUndefined();
      expect(g[2]['primaryImageOfPage']).toBeUndefined();
    });

    it('sin dominio las referencias son locales a la página', () => {
      const g = grafo(proyectoJsonLd({ ...datosBase, base: null }));
      expect(g[1]['@id']).toBe('#proyecto');
      expect(g[1]['url']).toBeUndefined();
      expect(g[2]['publisher']).toEqual({ '@id': '#organizacion' });
    });
  });
});
