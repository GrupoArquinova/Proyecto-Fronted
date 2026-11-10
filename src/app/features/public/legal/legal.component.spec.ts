import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdiomaService } from '../../../core/services/idioma.service';
import { SeoService } from '../../../core/services/seo.service';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import contenido from './legal-contenido.json';
import { LegalComponent } from './legal.component';

/** Como en la aplicación real (app.config.ts): los textos se vuelven a pintar al cambiar de idioma. */
const REPINTAR_AL_CAMBIAR_IDIOMA = {
  provide: TRANSLOCO_CONFIG,
  useValue: translocoConfig({ availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es', reRenderOnLangChange: true }),
};

function crear(slug: string | null) {
  const params = new BehaviorSubject(convertToParamMap(slug ? { slug } : {}));
  const establecer = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideI18nPruebas(),
      REPINTAR_AL_CAMBIAR_IDIOMA,
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: SeoService, useValue: { establecer } },
    ],
  });
  const fixture = TestBed.createComponent(LegalComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  return { fixture, el, params, establecer, refrescar, idioma: TestBed.inject(IdiomaService) };
}

const docs = contenido as unknown as Record<string, { titulo: string; resumen: string; corto: string; secciones: { titulo: string }[] }>;

describe('LegalComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra el documento del slug con su título, resumen y todas sus secciones', () => {
    const { el } = crear('terminos');

    const doc = docs['terminos'];
    expect(el.querySelector('h1')?.textContent).toBe(doc.titulo);
    expect(el.querySelector('.resumen')?.textContent).toBe(doc.resumen);
    expect(el.querySelectorAll('section')).toHaveLength(doc.secciones.length);
    expect(el.querySelector('section h2')?.textContent).toBe(doc.secciones[0].titulo);
    expect(el.querySelector('.cortesia')).toBeNull();
    expect(el.querySelector('.volver')?.getAttribute('href')).toBe('/');
  });

  it('el menú "otros documentos" lista los demás y excluye el actual', () => {
    const { el } = crear('terminos');

    const enlaces = Array.from(el.querySelectorAll('nav.otros a')).map(a => a.getAttribute('href'));
    expect(enlaces).toHaveLength(Object.keys(docs).length - 1);
    expect(enlaces).not.toContain('/legal/terminos');
    expect(enlaces).toContain('/legal/politica-datos');
  });

  it('pone el título y descripción del documento en el SEO', () => {
    const { establecer } = crear('cookies');

    expect(establecer).toHaveBeenLastCalledWith({
      titulo: docs['cookies'].titulo, descripcion: docs['cookies'].resumen, ruta: '/legal/cookies',
    });
  });

  it('un slug que no existe muestra "Documento no encontrado", lista todos los documentos y pide no indexar', () => {
    const { el, establecer } = crear('inventado');

    expect(el.querySelector('h1')?.textContent).toBe('Documento no encontrado');
    expect(el.querySelector('.resumen')?.textContent).toContain('no existe');
    expect(el.querySelectorAll('nav.otros a')).toHaveLength(Object.keys(docs).length);
    expect(establecer).toHaveBeenLastCalledWith({ titulo: 'Página no encontrada', noindex: true });
  });

  it('sin slug también muestra el documento no encontrado', () => {
    const { el } = crear(null);

    expect(el.querySelector('h1')?.textContent).toBe('Documento no encontrado');
  });

  it('al navegar a otro documento se actualiza el contenido y el SEO', () => {
    const { el, params, refrescar, establecer } = crear('terminos');

    params.next(convertToParamMap({ slug: 'aviso-legal' }));
    refrescar();

    expect(el.querySelector('h1')?.textContent).toBe(docs['aviso-legal'].titulo);
    expect(establecer).toHaveBeenLastCalledWith(expect.objectContaining({ ruta: '/legal/aviso-legal' }));
  });

  it('los datos de la empresa se insertan y los pendientes salen resaltados como "por completar"', () => {
    const { el } = crear('politica-datos');

    expect(el.textContent).toContain('Grupo Arquinova S.A.S.');
    expect(el.textContent).not.toContain('{{');
    const pendientes = Array.from(el.querySelectorAll('mark')).map(m => m.textContent);
    expect(pendientes.length).toBeGreaterThan(0);
    expect(pendientes.every(p => /^\[por completar: .+\]$/.test(p ?? ''))).toBe(true);
  });

  it('en inglés muestra el aviso de traducción de cortesía, el texto traducido y los pendientes en inglés', async () => {
    const { el, idioma, refrescar } = crear('politica-datos');

    idioma.cambiar('en');
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    await vi.waitFor(() => {
      refrescar();
      expect(el.querySelector('.volver')?.textContent).toContain('Back to Home');
    });

    expect(el.querySelector('.cortesia')?.textContent).toContain('Courtesy translation');
    expect(el.querySelector('.volver')?.textContent).toContain('Back to Home');
    expect(el.querySelector('h1')?.textContent).not.toBe(docs['politica-datos'].titulo);
    const pendientes = Array.from(el.querySelectorAll('mark')).map(m => m.textContent);
    expect(pendientes.every(p => /^\[to be completed: .+\]$/.test(p ?? ''))).toBe(true);
  });

  it('partes() divide un texto en tramos normales y pendientes', () => {
    const { fixture } = crear('terminos');

    expect(fixture.componentInstance.partes('Hola {{razonSocial}}.')).toEqual([
      { texto: 'Hola ', pendiente: false },
      { texto: 'Grupo Arquinova S.A.S.', pendiente: false },
      { texto: '.', pendiente: false },
    ]);
  });
});
