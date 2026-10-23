import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { ContenidoInstitucional } from '../../../core/models/contenido.models';
import { ProyectoPublico } from '../../../core/models/proyecto.models';
import { ContenidoService } from '../../../core/services/contenido.service';
import { IdiomaService } from '../../../core/services/idioma.service';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { SeoService } from '../../../core/services/seo.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';
import { TURNSTILE_SITE_KEY, TurnstileApi } from '../../../core/services/turnstile.service';
import { provideI18nPruebas } from '../../../i18n/pruebas';
import { EMPRESA_INFO, SERVICIOS } from './empresa-contenido';
import { HomeComponent } from './home.component';

/** Como en la aplicación real (app.config.ts): los textos se vuelven a pintar al cambiar de idioma. */
const REPINTAR_AL_CAMBIAR_IDIOMA = {
  provide: TRANSLOCO_CONFIG,
  useValue: translocoConfig({ availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es', reRenderOnLangChange: true }),
};

function proyecto(id: number, extra: Partial<ProyectoPublico> = {}): ProyectoPublico {
  return {
    id,
    empresaId: 7,
    nombre: `Proyecto ${id}`,
    imagenUrl: `https://img/${id}.jpg`,
    estado: 'En construcción',
    estadoProyecto: 'EN_CONSTRUCCION',
    ubicacion: 'Armenia, Quindío',
    municipio: 'Armenia',
    descripcion: `Descripción ${id}`,
    totalLotes: 10 + id,
    lotesDisponibles: id,
    ...extra,
  } as ProyectoPublico;
}

const contenido = (seccion: string, texto: string, extra: Partial<ContenidoInstitucional> = {}): ContenidoInstitucional =>
  ({ empresaId: 7, seccion, titulo: seccion, contenido: texto, publicado: true, ...extra });

interface Opciones {
  proyectos?: ProyectoPublico[];
  errorCatalogo?: boolean;
  contenidos?: ContenidoInstitucional[];
  errorContenido?: boolean;
  claveCaptcha?: string;
}

function crear(op: Opciones = {}) {
  const proyectos = op.proyectos ?? [];
  const catalogo = vi.fn(() => op.errorCatalogo
    ? throwError(() => new Error('falló'))
    : of({ proyectos, totalLotes: 0 }));
  const publicados = vi.fn(() => op.errorContenido ? throwError(() => new Error('falló')) : of(op.contenidos ?? []));
  const enviarSolicitud = vi.fn(() => of({}));
  const establecer = vi.fn();

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideI18nPruebas(),
      REPINTAR_AL_CAMBIAR_IDIOMA,
      { provide: ProyectoService, useValue: { obtenerCatalogoPublico: catalogo } },
      { provide: ContenidoService, useValue: { obtenerPublicadosPorEmpresa: publicados } },
      { provide: SolicitudService, useValue: { enviarSolicitud } },
      { provide: TURNSTILE_SITE_KEY, useValue: op.claveCaptcha ?? '' },
      { provide: SeoService, useValue: { establecer, urlAbsoluta: (r: string) => `https://arquinova.test${r}` } },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture, el, catalogo, publicados, enviarSolicitud, establecer,
    toast: TestBed.inject(ToastService),
    idioma: TestBed.inject(IdiomaService),
    refrescar: () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    },
    escribir: (selector: string, valor: string) => {
      const campo = el.querySelector<HTMLInputElement>(selector)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      campo.dispatchEvent(new Event('change'));
    },
  };
}

describe('HomeComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('muestra la empresa, los siete servicios y los datos de contacto aunque no haya proyectos', () => {
    const { el } = crear();

    expect(el.querySelector('#empresa h2')?.textContent).toContain('Quiénes somos');
    expect(el.querySelectorAll('.service-card')).toHaveLength(SERVICIOS.length);
    expect(el.querySelector('.service-card h3')?.textContent).toContain('Estudios de viabilidad');
    expect(el.querySelector('#contacto')?.textContent).toContain(environment.contacto.correo);
    expect(el.querySelector('#contacto')?.textContent).toContain(EMPRESA_INFO.oficina);
    expect(el.querySelector('.footer-arquinova')?.textContent).toContain(`NIT ${EMPRESA_INFO.nit}`);
    expect(el.querySelector('#destacado')).toBeNull();
    expect(el.querySelectorAll('.project-card')).toHaveLength(0);
    expect(el.querySelector('.identity-grid')).toBeNull();
  });

  it('el menú ofrece las secciones, el selector de idioma y el acceso al panel', () => {
    const { el } = crear();

    const enlaces = Array.from(el.querySelectorAll('.nav-links a')).map(a => a.getAttribute('href'));
    expect(enlaces).toEqual(expect.arrayContaining(['#inicio', '#servicios', '#proyectos', '#empresa', '#contacto', '/login']));
    expect(el.querySelector('app-selector-idioma')).not.toBeNull();
    expect(el.querySelector('app-boton-pantalla-completa')).not.toBeNull();
  });

  it('con proyectos muestra solo las tres primeras tarjetas y el total en el botón de ver todos', () => {
    const lista = [1, 2, 3, 4, 5].map(i => proyecto(i));
    const { el, fixture } = crear({ proyectos: lista });

    const tarjetas = el.querySelectorAll('#proyectos .project-card');
    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].textContent).toContain('Proyecto 1');
    expect(tarjetas[0].textContent).toContain('En construcción');
    expect(tarjetas[0].querySelector('.card-link')?.getAttribute('href')).toBe('/proyectos/1');
    expect(el.querySelector('#proyectos a[href="/proyectos"]')?.textContent).toContain('Ver todos los proyectos (5)');
    expect(fixture.componentInstance.totalProyectos()).toBe(5);
    // el select del formulario ofrece todos, no solo tres
    expect(el.querySelectorAll('#home-campo-5 option')).toHaveLength(6);
  });

  it('una tarjeta de portafolio muestra la participación y no las métricas de lotes', () => {
    const { el } = crear({
      proyectos: [proyecto(1, { tipoRegistro: 'PORTAFOLIO', participacion: 'Diseño estructural' })],
    });

    const tarjeta = el.querySelector('#proyectos .project-card')!;
    expect(tarjeta.textContent).toContain('Portafolio');
    expect(tarjeta.textContent).toContain('Diseño estructural');
    expect(tarjeta.querySelector('.card-metrics')).toBeNull();
  });

  it('una oferta comercial muestra lotes y disponibles', () => {
    const { el } = crear({ proyectos: [proyecto(2, { totalLotes: 40, lotesDisponibles: 12 })] });

    const metricas = Array.from(el.querySelectorAll('#proyectos .metric strong')).map(m => m.textContent);
    expect(metricas).toEqual(['40', '12', '360°']);
  });

  it('un proyecto sin estadoProyecto muestra el texto de estado tal cual', () => {
    const { el } = crear({ proyectos: [proyecto(1, { estadoProyecto: undefined, estado: 'Preventa' })] });

    expect(el.querySelector('#proyectos .badge-status')?.textContent).toContain('Preventa');
  });

  it('el proyecto destacado se muestra arriba, en el menú, con enlace al detalle y WhatsApp con mensaje armado', () => {
    const { el, fixture } = crear({ proyectos: [proyecto(1), proyecto(2, { destacado: true, nombre: 'El Encanto' })] });

    const seccion = el.querySelector('#destacado')!;
    expect(seccion.querySelector('h2')?.textContent).toContain('El Encanto');
    expect(seccion.querySelector('a[href="/proyectos/2"]')).not.toBeNull();
    expect(el.querySelector('.nav-links a[href="/proyectos/2"]')?.textContent).toContain('El Encanto');

    const whatsapp = seccion.querySelector<HTMLAnchorElement>('.btn-outline')!.getAttribute('href')!;
    expect(whatsapp.startsWith(`https://wa.me/${environment.contacto.whatsapp}?text=`)).toBe(true);
    expect(decodeURIComponent(whatsapp)).toContain('Hola, estoy interesado en El Encanto');
    expect(fixture.componentInstance.whatsappDestacado()).toBe(whatsapp);
  });

  it('si el catálogo falla, registra el error y la página sigue mostrando lo demás', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { el, publicados, fixture } = crear({ errorCatalogo: true });

    expect(error).toHaveBeenCalled();
    expect(publicados).toHaveBeenCalledWith(environment.empresaId);
    expect(el.querySelectorAll('.project-card')).toHaveLength(0);
    expect(el.querySelectorAll('.service-card')).toHaveLength(SERVICIOS.length);
    expect(fixture.componentInstance.totalProyectos()).toBe(0);
  });

  it('pide la identidad con la empresa del primer proyecto', () => {
    const { publicados } = crear({ proyectos: [proyecto(1, { empresaId: 99 })] });

    expect(publicados).toHaveBeenCalledWith(99);
  });

  it('muestra misión, visión y valores solo si están publicados', () => {
    const { el } = crear({
      proyectos: [proyecto(1)],
      contenidos: [
        contenido('MISION', 'Nuestra misión', { contenidoEn: 'Our mission' }),
        contenido('VISION', 'Visión oculta', { publicado: false }),
        contenido('VALORES', 'Respeto'),
      ],
    });

    const tarjetas = Array.from(el.querySelectorAll('.identity-card'));
    expect(tarjetas.map(t => t.querySelector('h3')?.textContent)).toEqual(['Misión', 'Valores']);
    expect(tarjetas[0].textContent).toContain('Nuestra misión');
  });

  it('si falla la carga de la identidad no muestra el bloque', () => {
    const { el } = crear({ proyectos: [proyecto(1)], errorContenido: true });

    expect(el.querySelector('.identity-grid')).toBeNull();
  });

  it('al cambiar a inglés traduce los textos, el contenido localizado y vuelve a poner el SEO', async () => {
    const { el, idioma, establecer, fixture } = crear({
      proyectos: [proyecto(1, { destacado: true, descripcion: 'Casa en el campo', descripcionEn: 'House in the country' })],
      contenidos: [contenido('MISION', 'Misión', { contenidoEn: 'Mission text' })],
    });
    expect(establecer).toHaveBeenLastCalledWith(expect.objectContaining({
      titulo: 'Arquitectura, ingeniería y gestión de proyectos en el Quindío', ruta: '/',
    }));

    idioma.cambiar('en');
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    await vi.waitFor(() => {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      expect(el.querySelector('#destacado .btn-outline')?.textContent).toContain('Talk to an advisor');
    });

    await vi.waitFor(() => expect(establecer).toHaveBeenLastCalledWith(expect.objectContaining({
      titulo: 'Architecture, engineering and project management in Quindío',
    })));
    expect(el.querySelector('#destacado')?.textContent).toContain('House in the country');
    expect(el.querySelector('.identity-card')?.textContent).toContain('Mission text');
    expect(el.querySelector('#destacado .btn-outline')?.textContent).toContain('Talk to an advisor');
  });

  it('el SEO incluye los datos de la organización en JSON-LD', () => {
    const { establecer } = crear();

    const datos = establecer.mock.calls.at(-1)![0];
    expect(datos.jsonLd).toMatchObject({
      '@type': 'Organization',
      name: EMPRESA_INFO.nombre,
      taxID: EMPRESA_INFO.nit,
      url: 'https://arquinova.test/',
      address: { addressLocality: 'Armenia', addressCountry: 'CO' },
    });
  });

  describe('formulario de contacto', () => {
    it('el botón de enviar está bloqueado hasta aceptar el consentimiento y dar un medio de contacto', () => {
      const { el, fixture, escribir } = crear();
      const boton = () => el.querySelector<HTMLButtonElement>('.btn-submit')!;
      expect(boton().disabled).toBe(true);

      escribir('#home-campo-1', 'Laura');
      escribir('#home-campo-2', '3001234567');
      fixture.detectChanges();
      expect(boton().disabled).toBe(true); // falta el consentimiento

      const casilla = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      casilla.click();
      fixture.detectChanges();
      expect(boton().disabled).toBe(false);
    });

    it('sin teléfono ni correo el formulario no es válido', () => {
      const { fixture } = crear();
      const f = fixture.componentInstance.contactoForm;

      f.patchValue({ nombre: 'Laura', consentimientoDatos: true });

      expect(f.hasError('sinMedioDeContacto')).toBe(true);
      expect(f.valid).toBe(false);
    });

    it('enviar un formulario inválido solo marca los campos como tocados y no llama al servidor', () => {
      const { fixture, enviarSolicitud, el, refrescar } = crear();

      fixture.componentInstance.enviarFormulario();
      refrescar();

      expect(enviarSolicitud).not.toHaveBeenCalled();
      expect(fixture.componentInstance.contactoForm.touched).toBe(true);
      expect(el.querySelector('.aviso-medio')?.classList.contains('error')).toBe(true);
    });

    it('envía la solicitud con el proyecto como número, el servicio y el user agent, y avisa el éxito', () => {
      const { fixture, enviarSolicitud, toast } = crear({ proyectos: [proyecto(5)] });
      const c = fixture.componentInstance;
      c.contactoForm.patchValue({
        nombre: 'Laura', correo: 'laura@correo.com', proyectoId: '5',
        servicioInteres: 'Licencias y permisos', mensaje: 'Hola', consentimientoDatos: true,
      });

      c.enviarFormulario();

      expect(enviarSolicitud).toHaveBeenCalledTimes(1);
      const dto = (enviarSolicitud.mock.calls[0] as unknown[])[0];
      expect(dto).toMatchObject({
        nombre: 'Laura', correo: 'laura@correo.com', proyectoId: 5,
        servicioInteres: 'Licencias y permisos', sitioWeb: '',
      });
      expect(toast.toasts().at(-1)).toMatchObject({ type: 'success', message: expect.stringContaining('Solicitud enviada con éxito') });
      // el formulario se limpia
      expect(c.contactoForm.value.nombre).toBeNull();
      expect(c.contactoForm.value.consentimientoDatos).toBeNull();
    });

    it('sin proyecto ni servicio elegidos manda proyectoId nulo y servicio sin definir', () => {
      const { fixture, enviarSolicitud } = crear();
      const c = fixture.componentInstance;
      c.contactoForm.patchValue({ nombre: 'Laura', telefono: '300', consentimientoDatos: true });

      c.enviarFormulario();

      const dto = (enviarSolicitud.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
      expect(dto['proyectoId']).toBeNull();
      expect(dto['servicioInteres']).toBeUndefined();
    });

    it('si el envío falla muestra el error y conserva lo que la persona escribió', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fixture, enviarSolicitud, toast } = crear();
      enviarSolicitud.mockReturnValueOnce(throwError(() => new Error('500')));
      const c = fixture.componentInstance;
      c.contactoForm.patchValue({ nombre: 'Laura', telefono: '300', consentimientoDatos: true });

      c.enviarFormulario();

      expect(error).toHaveBeenCalled();
      expect(toast.toasts().at(-1)).toMatchObject({ type: 'error', message: expect.stringContaining('Hubo un error al enviar') });
      expect(c.contactoForm.value.nombre).toBe('Laura');
    });
  });

  describe('captcha (Turnstile)', () => {
    afterEach(() => { delete (window as unknown as { turnstile?: TurnstileApi }).turnstile; });
    const conCaptcha = async () => {
      const callbacks: Record<string, (t?: string) => void> = {};
      const api = {
        render: vi.fn((_el: HTMLElement, op: Record<string, unknown>) => {
          callbacks['exito'] = op['callback'] as (t?: string) => void;
          callbacks['expira'] = op['expired-callback'] as () => void;
          return 'w1';
        }),
        reset: vi.fn(), remove: vi.fn(),
      };
      (window as unknown as { turnstile?: TurnstileApi }).turnstile = api as unknown as TurnstileApi;
      const ctx = crear({ claveCaptcha: 'clave-sitio' });
      await ctx.fixture.whenStable();
      ctx.refrescar();
      ctx.fixture.componentInstance.contactoForm.patchValue({ nombre: 'Laura', telefono: '300', consentimientoDatos: true });
      ctx.refrescar();
      return { ...ctx, api, callbacks };
    };

    it('sin clave no hay widget y se envía sin captchaToken', () => {
      const { fixture, enviarSolicitud, el } = crear();
      fixture.componentInstance.contactoForm.patchValue({ nombre: 'Laura', telefono: '300', consentimientoDatos: true });
      fixture.componentInstance.enviarFormulario();
      expect(el.querySelector('app-captcha-turnstile .captcha')).toBeNull();
      expect((enviarSolicitud.mock.calls[0] as unknown[])[0]).not.toHaveProperty('captchaToken');
    });

    it('con clave el botón queda deshabilitado y no envía hasta tener token', async () => {
      const { fixture, enviarSolicitud, el, callbacks, refrescar } = await conCaptcha();
      expect(el.querySelector<HTMLButtonElement>('.btn-submit')?.disabled).toBe(true);
      fixture.componentInstance.enviarFormulario();
      expect(enviarSolicitud).not.toHaveBeenCalled();

      callbacks['exito']('token-ok');
      refrescar();
      expect(el.querySelector<HTMLButtonElement>('.btn-submit')?.disabled).toBe(false);
    });

    it('envía el captchaToken y reinicia el widget; si expira vuelve a bloquear', async () => {
      const { fixture, enviarSolicitud, callbacks, api } = await conCaptcha();
      callbacks['exito']('token-ok');
      fixture.componentInstance.enviarFormulario();
      expect((enviarSolicitud.mock.calls[0] as unknown[])[0]).toMatchObject({ captchaToken: 'token-ok' });
      expect(api.reset).toHaveBeenCalledWith('w1');
      expect(fixture.componentInstance.captchaToken()).toBeNull();

      callbacks['exito']('otro');
      expect(fixture.componentInstance.puedeEnviar()).toBe(true);
      callbacks['expira']();
      expect(fixture.componentInstance.puedeEnviar()).toBe(false);
    });
  });
});
