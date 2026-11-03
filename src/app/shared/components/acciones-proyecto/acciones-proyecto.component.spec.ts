import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccionesProyectoComponent } from './acciones-proyecto.component';
import { AnaliticaService } from '../../../core/services/analitica.service';
import { SITIO_URL } from '../../../core/services/seo.service';
import { IdiomaService } from '../../../core/services/idioma.service';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { environment } from '../../../../environments/environment';

const nav = navigator as unknown as Record<string, unknown>;

describe('AccionesProyectoComponent', () => {
  let compartirAnalitica: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    compartirAnalitica = vi.spyOn(AnaliticaService.prototype, 'compartir').mockImplementation(() => undefined);
    delete nav['share'];
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete nav['share'];
    delete nav['clipboard'];
  });

  function crear(opciones: { sitio?: string; lugar?: string } = {}) {
    TestBed.configureTestingModule({
      providers: [provideI18nPruebas(), { provide: TRANSLOCO_CONFIG, useValue: translocoConfig({ availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es', reRenderOnLangChange: true }) }, { provide: SITIO_URL, useValue: opciones.sitio ?? 'https://sitio.test' }]
    });
    const fixture = TestBed.createComponent(AccionesProyectoComponent);
    fixture.componentRef.setInput('proyectoId', 6);
    fixture.componentRef.setInput('nombre', 'El Encanto');
    fixture.componentRef.setInput('lugar', opciones.lugar ?? 'La Tebaida, Quindío');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture, el, c: fixture.componentInstance,
      compartir: () => el.querySelector<HTMLButtonElement>('.btn-compartir')!,
      menu: () => el.querySelector('.menu-compartir'),
      esperar: async () => { await fixture.whenStable(); fixture.detectChanges(); }
    };
  }

  describe('brochure', () => {
    it('apunta al PDF del proyecto en el backend, en otra pestaña y como descarga', () => {
      const { el } = crear();
      const a = el.querySelector<HTMLAnchorElement>('a.btn-brochure')!;
      expect(a.getAttribute('href')).toBe(`${environment.apiUrl}/proyectos/6/brochure.pdf`);
      expect(a.hasAttribute('download')).toBe(true);
      expect(a.target).toBe('_blank');
      expect(a.rel).toContain('noopener');
      expect(a.textContent).toContain('Descargar brochure (PDF)');
      expect(a.getAttribute('aria-label')).toBe('Descargar el brochure de El Encanto en PDF');
    });
  });

  describe('compartir con el menú del dispositivo (Web Share API)', () => {
    it('comparte título, texto y la dirección del proyecto, y cuenta el evento', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      nav['share'] = share;
      const { compartir, menu, esperar } = crear();
      compartir().click();
      await esperar();

      expect(share).toHaveBeenCalledWith({
        title: 'El Encanto · Grupo Arquinova',
        text: 'Mira El Encanto en La Tebaida, Quindío, un proyecto de Grupo Arquinova.',
        url: 'https://sitio.test/proyectos/6'
      });
      expect(compartirAnalitica).toHaveBeenCalledWith(6);
      expect(menu()).toBeNull();
    });

    it('si la persona cierra el menú del sistema no pasa nada (ni error ni menú propio ni conteo)', async () => {
      nav['share'] = vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError'));
      const { compartir, menu, esperar } = crear();
      compartir().click();
      await esperar();
      expect(menu()).toBeNull();
      expect(compartirAnalitica).not.toHaveBeenCalled();
    });

    it('si compartir falla por otra razón, abre el menú propio', async () => {
      nav['share'] = vi.fn().mockRejectedValue(new Error('no permitido'));
      const { compartir, menu, esperar } = crear();
      compartir().click();
      await esperar();
      expect(menu()).not.toBeNull();
    });
  });

  describe('menú propio (sin Web Share API)', () => {
    it('se abre con WhatsApp, Facebook, X, correo y copiar enlace, y el botón informa si está abierto', async () => {
      const { compartir, menu, el, esperar } = crear();
      expect(compartir().getAttribute('aria-expanded')).toBe('false');
      compartir().click();
      await esperar();

      expect(compartir().getAttribute('aria-expanded')).toBe('true');
      expect(compartir().getAttribute('aria-controls')).toBe(menu()!.id);
      const items = Array.from(el.querySelectorAll('.menu-compartir li')).map((l) => l.textContent?.trim());
      expect(items).toEqual(['WhatsApp', 'Facebook', 'X (Twitter)', 'Correo electrónico', 'Copiar enlace']);
    });

    it('los enlaces llevan la dirección del proyecto y el texto codificados', async () => {
      const { compartir, el, esperar } = crear();
      compartir().click();
      await esperar();
      const href = (n: number) => el.querySelectorAll<HTMLAnchorElement>('.menu-compartir a')[n].getAttribute('href')!;

      expect(href(0)).toContain('https://wa.me/?text=');
      expect(decodeURIComponent(href(0))).toContain('https://sitio.test/proyectos/6');
      expect(href(1)).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsitio.test%2Fproyectos%2F6');
      expect(href(2)).toContain('https://twitter.com/intent/tweet?text=');
      expect(href(2)).toContain('url=https%3A%2F%2Fsitio.test%2Fproyectos%2F6');
      expect(href(3)).toMatch(/^mailto:\?subject=El%20Encanto/);
      for (const a of Array.from(el.querySelectorAll<HTMLAnchorElement>('.menu-compartir a')).slice(0, 3)) {
        expect(a.target).toBe('_blank');
        expect(a.rel).toBe('noopener noreferrer');
      }
    });

    it('sin dominio configurado usa la dirección del navegador', async () => {
      const { compartir, el, esperar } = crear({ sitio: '' });
      compartir().click();
      await esperar();
      expect(decodeURIComponent(el.querySelector<HTMLAnchorElement>('.menu-compartir a')!.getAttribute('href')!)).toContain(`${location.origin}/proyectos/6`);
    });

    it('elegir una red cuenta el evento y cierra el menú', async () => {
      const { compartir, el, menu, esperar } = crear();
      compartir().click();
      await esperar();
      const mailto = el.querySelectorAll<HTMLAnchorElement>('.menu-compartir a')[3];
      mailto.addEventListener('click', (e) => e.preventDefault());
      mailto.click();
      await esperar();
      expect(compartirAnalitica).toHaveBeenCalledWith(6);
      expect(menu()).toBeNull();
    });

    it('Escape cierra el menú y devuelve el foco al botón', async () => {
      const { compartir, menu, esperar, fixture } = crear();
      document.body.appendChild(fixture.nativeElement);
      compartir().click();
      await esperar();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await esperar();
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(compartir());
    });

    it('un clic fuera del componente lo cierra, pero uno dentro no', async () => {
      const { compartir, el, menu, esperar } = crear();
      compartir().click();
      await esperar();
      el.querySelector<HTMLElement>('.menu-compartir')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await esperar();
      expect(menu()).not.toBeNull();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await esperar();
      expect(menu()).toBeNull();
    });
  });

  describe('copiar enlace', () => {
    it('copia la dirección y lo confirma en una región de estado accesible', async () => {
      const escribir = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
      const { compartir, el, esperar, fixture } = crear();
      compartir().click();
      await esperar();
      el.querySelector<HTMLButtonElement>('.menu-compartir .copiar')!.click();

      await vi.waitFor(() => { fixture.detectChanges(); expect(el.querySelector('.aviso')?.textContent).toContain('Enlace copiado al portapapeles'); });
      expect(escribir).toHaveBeenCalledWith('https://sitio.test/proyectos/6');
      const aviso = el.querySelector('.aviso')!;
      expect(aviso.getAttribute('role')).toBe('status');
      expect(aviso.getAttribute('aria-live')).toBe('polite');
      expect(aviso.textContent).toContain('Enlace copiado al portapapeles');
      expect(compartirAnalitica).toHaveBeenCalledWith(6);
    });

    it('si el portapapeles falla usa el respaldo; si tampoco, avisa sin romper', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) }, configurable: true });
      const exec = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
      document.execCommand = exec;
      const { compartir, el, esperar, fixture } = crear();
      compartir().click();
      await esperar();
      const boton = () => el.querySelector<HTMLButtonElement>('.menu-compartir .copiar')!;

      boton().click();
      await vi.waitFor(() => { fixture.detectChanges(); expect(el.querySelector('.aviso')?.textContent).toContain('Enlace copiado'); });
      expect(document.querySelector('textarea')).toBeNull(); // el campo temporal se quita

      boton().click();
      await vi.waitFor(() => { fixture.detectChanges(); expect(el.querySelector('.aviso')?.textContent).toContain('No se pudo copiar'); });
      expect(compartirAnalitica).toHaveBeenCalledTimes(1);
    });

    it('el aviso desaparece solo', async () => {
      vi.useFakeTimers();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
      const { compartir, el, fixture } = crear();
      compartir().click();
      fixture.detectChanges();
      el.querySelector<HTMLButtonElement>('.menu-compartir .copiar')!.click();
      await vi.advanceTimersByTimeAsync(10);
      fixture.detectChanges();
      expect(el.querySelector('.aviso')?.textContent).toContain('copiado');
      await vi.advanceTimersByTimeAsync(4100);
      fixture.detectChanges();
      expect(el.querySelector('.aviso')?.textContent).toBe('');
      vi.useRealTimers();
    });
  });

  it('en inglés los textos y el mensaje para compartir cambian', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav['share'] = share;
    const { el, compartir, fixture, esperar } = crear();
    const idioma = TestBed.inject(IdiomaService);
    idioma.cambiar('en', false);
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    fixture.detectChanges();

    expect(compartir().textContent).toContain('Share');
    expect(el.querySelector('a.btn-brochure')?.textContent).toContain('Download brochure (PDF)');
    expect(compartir().getAttribute('aria-label')).toBe('Share El Encanto');
    compartir().click();
    await esperar();
    expect(share.mock.calls[0][0].text).toBe('Take a look at El Encanto in La Tebaida, Quindío, a Grupo Arquinova project.');
  });

  it('sin lugar el texto no lo menciona', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav['share'] = share;
    const { compartir, esperar } = crear({ lugar: '' });
    compartir().click();
    await esperar();
    expect(share.mock.calls[0][0].text).toBe('Mira El Encanto, un proyecto de Grupo Arquinova.');
  });
});
