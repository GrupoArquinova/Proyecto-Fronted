import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { describe, it, expect, beforeEach } from 'vitest';
import { SITIO_URL, SeoService, recortarDescripcion } from './seo.service';
import { provideI18nPruebas } from '../../i18n/pruebas';

describe('SeoService', () => {
  let seo: SeoService;
  let titulo: Title;
  let meta: Meta;
  let doc: Document;

  const contenido = (selector: string) => meta.getTag(selector)?.content;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
    seo = TestBed.inject(SeoService);
    titulo = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
  });

  it('pone el titulo con el nombre del sitio', () => {
    seo.establecer({ titulo: 'Proyectos' });
    expect(titulo.getTitle()).toBe('Proyectos | Grupo Arquinova');
  });

  it('no repite el nombre del sitio si el titulo ya lo trae', () => {
    seo.establecer({ titulo: 'Grupo Arquinova S.A.S.' });
    expect(titulo.getTitle()).toBe('Grupo Arquinova S.A.S.');
  });

  it('usa una descripcion por defecto cuando la pagina no trae una', () => {
    seo.establecer({ titulo: 'Proyectos' });
    expect(contenido('name="description"')).toContain('Grupo Arquinova');
  });

  it('sin dominio configurado (demo o desarrollo) pide no indexar ninguna pagina', () => {
    seo.establecer({ titulo: 'Inicio' });
    expect(contenido('name="robots"')).toBe('noindex, nofollow');
  });

  it('con imagen usa tarjeta grande y la imagen; sin imagen quita la de la pagina anterior', () => {
    seo.establecer({ titulo: 'El Encanto', imagen: 'https://img.test/portada.jpg' });
    expect(contenido('property="og:image"')).toBe('https://img.test/portada.jpg');
    expect(contenido('name="twitter:card"')).toBe('summary_large_image');

    seo.establecer({ titulo: 'Proyectos' });
    expect(meta.getTag('property="og:image"')).toBeNull();
    expect(contenido('name="twitter:card"')).toBe('summary');
  });

  it('ignora una imagen que no es un enlace completo', () => {
    seo.establecer({ titulo: 'El Encanto', imagen: 'data:image/png;base64,AAAA' });
    expect(meta.getTag('property="og:image"')).toBeNull();
  });

  describe('con dominio configurado', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideI18nPruebas(), { provide: SITIO_URL, useValue: 'https://www.ejemplo.com' }] });
      seo = TestBed.inject(SeoService);
      meta = TestBed.inject(Meta);
      doc = TestBed.inject(DOCUMENT);
    });

    it('indexa las paginas y pide no indexar las que lo indican', () => {
      seo.establecer({ titulo: 'Inicio' });
      expect(contenido('name="robots"')).toBe('index, follow');
      seo.establecer({ titulo: 'Panel', noindex: true });
      expect(contenido('name="robots"')).toBe('noindex, nofollow');
    });

    it('pone la direccion canonica y la de compartir con el dominio', () => {
      seo.establecer({ titulo: 'El Encanto', ruta: '/proyectos/6/bienvenida' });
      expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.ejemplo.com/proyectos/6/bienvenida');
      expect(contenido('property="og:url"')).toBe('https://www.ejemplo.com/proyectos/6/bienvenida');
    });
  });

  it('sin dominio configurado no inventa direccion canonica', () => {
    seo.establecer({ titulo: 'Inicio', ruta: '/' });
    expect(doc.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(seo.urlAbsoluta('/proyectos')).toBeNull();
  });

  it('guarda los datos estructurados y los quita en la pagina siguiente', () => {
    seo.establecer({ titulo: 'Inicio', jsonLd: { '@type': 'Organization', name: 'Grupo <Arquinova>' } });
    const script = doc.head.querySelector('script#datos-estructurados');
    expect(script?.textContent).toContain('"@type":"Organization"');
    // El "<" va escapado: un texto no puede cerrar la etiqueta script
    expect(script?.textContent).not.toContain('<Arquinova>');

    seo.establecer({ titulo: 'Proyectos' });
    expect(doc.head.querySelector('script#datos-estructurados')).toBeNull();
  });

  describe('recortarDescripcion', () => {
    it('deja igual un texto corto y junta los espacios y saltos de linea', () => {
      expect(recortarDescripcion('  Hola\n\n  mundo  ')).toBe('Hola mundo');
    });

    it('corta un texto largo en una palabra completa y agrega puntos suspensivos', () => {
      const largo = 'palabra '.repeat(40);
      const corto = recortarDescripcion(largo, 60);
      expect(corto.length).toBeLessThanOrEqual(60);
      expect(corto.endsWith('…')).toBe(true);
      expect(corto).not.toMatch(/palabr…$/);
    });
  });
});
