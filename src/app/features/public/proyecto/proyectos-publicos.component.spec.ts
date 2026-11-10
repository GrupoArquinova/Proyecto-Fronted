import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProyectoPublico } from '../../../core/models/proyecto.models';
import { IdiomaService } from '../../../core/services/idioma.service';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { ProyectosPublicosComponent } from './proyectos-publicos.component';

/** Como en la aplicación real (app.config.ts): los textos se vuelven a pintar al cambiar de idioma. */
const REPINTAR_AL_CAMBIAR_IDIOMA = {
  provide: TRANSLOCO_CONFIG,
  useValue: translocoConfig({ availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es', reRenderOnLangChange: true }),
};

function proyecto(id: number, extra: Partial<ProyectoPublico> = {}): ProyectoPublico {
  return {
    id, empresaId: 1, nombre: `Proyecto ${id}`, imagenUrl: `https://img/${id}.jpg`,
    estado: 'En construcción', estadoProyecto: 'EN_CONSTRUCCION', tipoProyecto: 'RESIDENCIAL',
    ubicacion: 'Armenia, Quindío', municipio: 'Armenia', descripcion: `Desc ${id}`,
    totalLotes: 20, lotesDisponibles: 5, ...extra,
  } as ProyectoPublico;
}

function crear(respuesta: ProyectoPublico[] | 'error') {
  const catalogo = vi.fn(() => respuesta === 'error'
    ? throwError(() => new Error('falló'))
    : of({ proyectos: respuesta, totalLotes: 0 }));
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideI18nPruebas(), REPINTAR_AL_CAMBIAR_IDIOMA, { provide: ProyectoService, useValue: { obtenerCatalogoPublico: catalogo } }],
  });
  const fixture = TestBed.createComponent(ProyectosPublicosComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const elegir = (etiqueta: string, valor: string) => {
    const select = el.querySelector<HTMLSelectElement>(`select[aria-label="${etiqueta}"]`)!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  return { fixture, el, elegir, c: fixture.componentInstance, tarjetas: () => el.querySelectorAll('.project-card') };
}

const VARIOS = [
  proyecto(1, { municipio: 'Armenia', tipoProyecto: 'RESIDENCIAL', estadoProyecto: 'EN_CONSTRUCCION' }),
  proyecto(2, { municipio: 'Calarcá', tipoProyecto: 'RURAL', estadoProyecto: 'EN_DISENO', estado: 'En diseño' }),
  proyecto(3, { municipio: 'Armenia', tipoProyecto: 'RURAL', estadoProyecto: 'FINALIZADO', estado: 'Finalizado' }),
];

describe('ProyectosPublicosComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra el encabezado, el enlace de regreso y una tarjeta por proyecto', () => {
    const { el, tarjetas } = crear(VARIOS);

    expect(el.querySelector('h2')?.textContent).toContain('Todos Nuestros Proyectos');
    expect(el.querySelector('.back-home a')?.getAttribute('href')).toBe('/');
    expect(tarjetas()).toHaveLength(3);
    expect(tarjetas()[0].querySelector('.card-link')?.getAttribute('href')).toBe('/proyectos/1');
    expect(tarjetas()[0].querySelector('.badge-status')?.textContent).toContain('En construcción');
  });

  it('sin proyectos no hay tarjetas, ni filtros, ni aviso de "sin resultados"', () => {
    const { el, tarjetas } = crear([]);

    expect(tarjetas()).toHaveLength(0);
    expect(el.querySelector('.filtros')).toBeNull();
    expect(el.querySelector('.sin-resultados')).toBeNull();
  });

  it('si la carga falla registra el error y deja la lista vacía', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { tarjetas, c } = crear('error');

    expect(error).toHaveBeenCalled();
    expect(c.listaProyectos()).toEqual([]);
    expect(tarjetas()).toHaveLength(0);
  });

  it('con un solo proyecto no ofrece filtros (no habría qué elegir)', () => {
    const { el, c } = crear([proyecto(1)]);

    expect(c.hayFiltros).toBe(false);
    expect(el.querySelector('.filtros')).toBeNull();
  });

  it('ofrece solo los filtros con más de una opción, con valores únicos y ordenados', () => {
    const { el, c } = crear([
      proyecto(1, { municipio: 'Calarcá' }), proyecto(2, { municipio: 'Armenia' }), proyecto(3, { municipio: 'Calarcá' }),
    ]);

    expect(c.municipios).toEqual(['Armenia', 'Calarcá']);
    expect(c.tipos).toHaveLength(1);
    expect(c.etapas).toHaveLength(1);
    expect(el.querySelectorAll('.filtros select')).toHaveLength(1);
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe('Municipio');
  });

  it('filtra por municipio, tipo y etapa y muestra "Quitar filtros" solo mientras filtra', () => {
    const { el, elegir, tarjetas, fixture } = crear(VARIOS);
    expect(el.querySelector('.limpiar')).toBeNull();

    elegir('Municipio', 'Armenia');
    expect(tarjetas()).toHaveLength(2);
    expect(el.querySelector('.limpiar')).not.toBeNull();

    elegir('Tipo de proyecto', 'RURAL');
    expect(tarjetas()).toHaveLength(1);
    expect(tarjetas()[0].textContent).toContain('Proyecto 3');

    elegir('Etapa', 'FINALIZADO');
    expect(tarjetas()).toHaveLength(1);
    expect(fixture.componentInstance.filtrando).toBe(true);
  });

  it('los textos de tipo y etapa de las opciones salen traducidos', () => {
    const { el } = crear(VARIOS);

    const opcionesTipo = Array.from(el.querySelectorAll('select[aria-label="Tipo de proyecto"] option')).map(o => o.textContent?.trim());
    expect(opcionesTipo).toEqual(['Todos los tipos', 'Residencial', 'Rural']);
    const opcionesEtapa = Array.from(el.querySelectorAll('select[aria-label="Etapa"] option')).map(o => o.textContent?.trim());
    expect(opcionesEtapa).toEqual(['Todas las etapas', 'En diseño', 'En construcción', 'Finalizado']);
  });

  it('si ningún proyecto cumple los filtros avisa y "Quitar filtros" restablece la lista', () => {
    const { el, elegir, tarjetas, fixture } = crear(VARIOS);

    elegir('Municipio', 'Calarcá');
    elegir('Tipo de proyecto', 'RESIDENCIAL');
    expect(tarjetas()).toHaveLength(0);
    expect(el.querySelector('.sin-resultados')?.textContent).toContain('No hay proyectos con esos filtros.');

    el.querySelector<HTMLButtonElement>('.limpiar')!.click();
    fixture.detectChanges();

    expect(tarjetas()).toHaveLength(3);
    expect(el.querySelector('.sin-resultados')).toBeNull();
    expect(el.querySelector('.limpiar')).toBeNull();
  });

  it('limpiarFiltros deja todos los filtros vacíos', () => {
    const { c } = crear(VARIOS);
    c.filtroMunicipio = 'Armenia';
    c.filtroTipo = 'RURAL';
    c.filtroEtapa = 'FINALIZADO';

    c.limpiarFiltros();

    expect([c.filtroMunicipio, c.filtroTipo, c.filtroEtapa]).toEqual(['', '', '']);
    expect(c.filtrando).toBe(false);
  });

  it('una tarjeta de portafolio muestra la participación y sin imagen usa la imagen por defecto', () => {
    const { tarjetas } = crear([proyecto(1, {
      tipoRegistro: 'PORTAFOLIO', participacion: 'Diseño urbanístico', imagenUrl: '', ubicacion: '',
    })]);

    const t = tarjetas()[0];
    expect(t.textContent).toContain('Portafolio');
    expect(t.textContent).toContain('Diseño urbanístico');
    expect(t.textContent).toContain('Colombia'); // ubicación por defecto
    expect(t.querySelector('.card-metrics')).toBeNull();
    expect(t.querySelector<HTMLElement>('.card-image')!.style.backgroundImage).toContain('assets/images/default-project.svg');
  });

  it('una oferta comercial muestra sus métricas y, sin cifras, cero', () => {
    const { tarjetas } = crear([proyecto(1, { totalLotes: undefined as unknown as number, lotesDisponibles: 0 })]);

    expect(Array.from(tarjetas()[0].querySelectorAll('.metric strong')).map(m => m.textContent)).toEqual(['0', '0', '360°']);
  });

  it('un proyecto sin etapa conocida muestra el estado en texto y uno sin estado no muestra insignia', () => {
    const { tarjetas } = crear([
      proyecto(1, { estadoProyecto: undefined, estado: 'Preventa' }),
      proyecto(2, { estado: '' }),
    ]);

    expect(tarjetas()[0].querySelector('.badge-status')?.textContent).toContain('Preventa');
    expect(tarjetas()[1].querySelector('.badge-status')).toBeNull();
  });

  it('en inglés muestra la descripción traducida si existe y, si no, la de español', async () => {
    const { fixture, el } = crear([
      proyecto(1, { descripcion: 'Casa de campo', descripcionEn: 'Country house' }),
      proyecto(2, { descripcion: 'Solo español' }),
    ]);
    const idioma = TestBed.inject(IdiomaService);

    idioma.cambiar('en');
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    await vi.waitFor(() => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(el.querySelector('h2')?.textContent).toContain('All Our Projects');
    });

    const textos = Array.from(el.querySelectorAll('.card-body > p')).map(p => p.textContent);
    expect(textos).toEqual(['Country house', 'Solo español']);
    expect(el.querySelector('h2')?.textContent).toContain('All Our Projects');
  });
});
