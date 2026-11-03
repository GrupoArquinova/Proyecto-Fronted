import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdiomaService } from './idioma.service';
import { LOGO_URL } from '../utils/seo-jsonld';
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

  it('con imagen usa tarjeta grande y la imagen; sin imagen vuelve al logo con tarjeta pequeña', () => {
    seo.establecer({ titulo: 'El Encanto', imagen: 'https://img.test/portada.jpg', imagenAlt: 'Portada de El Encanto' });
    expect(contenido('property="og:image"')).toBe('https://img.test/portada.jpg');
    expect(contenido('property="og:image:alt"')).toBe('Portada de El Encanto');
    expect(contenido('name="twitter:card"')).toBe('summary_large_image');

    seo.establecer({ titulo: 'Proyectos' });
    expect(contenido('property="og:image"')).toBe(LOGO_URL);
    expect(contenido('name="twitter:card"')).toBe('summary');
  });

  it('ignora una imagen que no es un enlace completo y usa el logo', () => {
    seo.establecer({ titulo: 'El Encanto', imagen: 'data:image/png;base64,AAAA' });
    expect(contenido('property="og:image"')).toBe(LOGO_URL);
  });

  it('las páginas que no se indexan no llevan imagen para compartir', () => {
    seo.establecer({ titulo: 'Panel', noindex: true });
    expect(meta.getTag('property="og:image"')).toBeNull();
    expect(meta.getTag('name="twitter:image"')).toBeNull();
  });

  it('pone og:locale y <html lang> según el idioma y los cambia al cambiar de idioma', async () => {
    seo.establecer({ titulo: 'Proyectos' });
    expect(contenido('property="og:locale"')).toBe('es_CO');
    expect(contenido('property="og:locale:alternate"')).toBe('en_US');
    expect(doc.documentElement.lang).toBe('es');

    const idioma = TestBed.inject(IdiomaService);
    // Primero se deja correr el arranque del idioma (toma el del navegador); luego se cambia a inglés
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 20));
    idioma.cambiar('en', false);
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(contenido('property="og:locale"')).toBe('en_US');
    });
    expect(contenido('property="og:locale:alternate"')).toBe('es_CO');
    expect(doc.documentElement.lang).toBe('en');
    doc.documentElement.lang = 'es';
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
