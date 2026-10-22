import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { environment } from '../../../../../../environments/environment';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { ContactoPublicoComponent } from './contacto.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const detalle = (extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda' },
  ubicacion: { proyectoId: 7, ciudad: 'Tunja', departamento: 'Boyacá' },
  zonasComunes: [], casasModelo: [{ id: 8, proyectoId: 7, nombre: 'Villa Samán', publicado: true, activo: true }],
  lotes: [{ id: 3, codigo: 'L3', areaM2: 800, activo: true, estadoId: 1, proyectoId: 7 }, { id: 4, codigo: 'L4', areaM2: 900, activo: true, estadoId: 1, proyectoId: 7 }],
  multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'proyectos/:id/contacto', component: ContactoPublicoComponent },
        { path: '**', component: Vacio }
      ]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/contacto${consulta}`, ContactoPublicoComponent);
  harness.detectChanges();
  const el = harness.routeNativeElement as HTMLElement;
  const escribir = (selector: string, valor: string) => {
    const campo = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    harness.detectChanges();
  };
  return {
    harness, instancia, el, escribir, enviar,
    http: TestBed.inject(HttpTestingController), toast: TestBed.inject(ToastService), router: TestBed.inject(Router)
  };
}

const URL_API = `${environment.apiUrl}/solicitudes-contacto/publico`;

describe('ContactoPublicoComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  describe('contenido', () => {
    it('muestra el título, el subtítulo con el proyecto y los datos de contacto de la empresa', async () => {
      const { el } = await abrir(detalle());
      expect(el.querySelector('h2')?.textContent).toBe('Contáctanos');
      expect(el.querySelector('.sub')?.textContent).toBe('Déjanos tus datos y te contamos todo sobre La Hacienda.');
      const [telefono, whatsapp] = Array.from(el.querySelectorAll<HTMLAnchorElement>('.pie a'));
      expect(telefono.getAttribute('href')).toBe(`tel:+${environment.contacto.whatsapp}`);
      expect(telefono.textContent).toBe(environment.contacto.telefonoTexto);
      expect(whatsapp.getAttribute('href')).toBe(`https://wa.me/${environment.contacto.whatsapp}`);
      expect(el.querySelector('.pie span')?.textContent).toBe('Tunja, Boyacá');
    });

    it('sin ubicación no muestra el lugar', async () => {
      const { el, instancia } = await abrir(detalle({ ubicacion: null }));
      expect(instancia.lugar()).toBe('');
      expect(el.querySelector('.pie span')).toBeNull();
    });

    it('sin detalle no pinta el formulario', async () => {
      const { el } = await abrir(null);
      expect(el.querySelector('form')).toBeNull();
    });
  });

  describe('lote o villa por query param', () => {
    it('con ?lote=<id> avisa del lote y deja el mensaje escrito', async () => {
      const { el, instancia } = await abrir(detalle(), '?lote=3');
      expect(el.querySelector('.lote')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Consultando por el lote L3');
      expect(instancia.form.controls.mensaje.value).toBe('Hola, me interesa el lote L3. ¿Me pueden dar más información?');
      expect(el.querySelector<HTMLTextAreaElement>('textarea')?.value).toContain('lote L3');
    });

    it('con ?casa=<id> deja el mensaje de la villa, sin aviso de lote', async () => {
      const { el, instancia } = await abrir(detalle(), '?casa=8');
      expect(instancia.form.controls.mensaje.value).toBe('Hola, me interesa la villa Villa Samán. ¿Me pueden dar más información?');
      expect(el.querySelector('.lote')).toBeNull();
    });

    it('si llegan lote y casa, gana el lote', async () => {
      const { instancia } = await abrir(detalle(), '?lote=4&casa=8');
      expect(instancia.form.controls.mensaje.value).toContain('lote L4');
    });

    it('un id que no existe en el proyecto no escribe mensaje', async () => {
      const { instancia, el } = await abrir(detalle(), '?lote=99&casa=77');
      expect(instancia.lote()).toBeNull();
      expect(instancia.casa()).toBeNull();
      expect(instancia.form.controls.mensaje.value).toBe('');
      expect(el.querySelector('.lote')).toBeNull();
    });

    it('un valor no numérico se ignora', async () => {
      const { instancia } = await abrir(detalle(), '?lote=abc');
      expect(instancia.lote()).toBeNull();
    });

    it('no pisa lo que la persona ya escribió cuando cambia el lote', async () => {
      const { harness, instancia, escribir } = await abrir(detalle(), '?lote=3');
      escribir('textarea', 'Mi propio mensaje');
      await harness.navigateByUrl('/proyectos/7/contacto?lote=4', ContactoPublicoComponent);
      harness.detectChanges();
      expect(instancia.lote()?.codigo).toBe('L4');
      expect(instancia.form.controls.mensaje.value).toBe('Mi propio mensaje');
    });
  });

  describe('validaciones', () => {
    it('al enviar vacío marca todos los campos, muestra los avisos y no llama al servidor', async () => {
      const { el, enviar, http } = await abrir(detalle());
      enviar();
      const textos = Array.from(el.querySelectorAll('small, .aviso')).map(s => s.textContent?.trim());
      expect(textos).toContain('Escribe tu nombre.');
      expect(textos).toContain('Cuéntanos qué necesitas.');
      expect(textos).toContain('Déjanos un teléfono o un correo para poder responderte.');
      expect(textos).toContain('Debes autorizar el tratamiento de tus datos.');
      expect(el.querySelector('input[formControlName="nombre"]')?.classList.contains('error')).toBe(true);
      http.expectNone(URL_API);
    });

    it('antes de tocar nada solo se ve la ayuda del medio de contacto', async () => {
      const { el } = await abrir(detalle());
      expect(el.querySelector('small.ayuda')?.textContent).toBe('Con teléfono o correo es suficiente.');
      expect(el.querySelector('.aviso')).toBeNull();
    });

    it('un correo mal escrito muestra su aviso', async () => {
      const { el, escribir, harness, instancia } = await abrir(detalle());
      escribir('input[type="email"]', 'no-es-correo');
      instancia.form.controls.correo.markAsTouched();
      harness.detectChanges();
      expect(el.querySelector('.campo-correo small')?.textContent).toBe('Escribe un correo válido.');
    });

    it('con solo el teléfono el medio de contacto es suficiente', async () => {
      const { instancia, escribir } = await abrir(detalle());
      escribir('input[type="tel"]', '3001234567');
      expect(instancia.form.hasError('sinMedioDeContacto')).toBe(false);
      expect(instancia.faltaMedioDeContacto()).toBe(false);
    });
  });

  describe('envío', () => {
    const llenar = (c: Awaited<ReturnType<typeof abrir>>) => {
      c.escribir('input[type="text"]', 'Ana Pérez');
      c.escribir('input[type="tel"]', '3001234567');
      c.escribir('textarea', 'Quiero información');
      c.el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    };

    it('envía la solicitud pública con proyecto, lote, villa e idioma (sin ip ni user-agent: los fija el backend); luego muestra éxito y limpia el formulario', async () => {
      const c = await abrir(detalle(), '?lote=3&casa=8');
      llenar(c);
      c.enviar();

      expect(c.instancia.enviando()).toBe(true);
      expect(c.el.querySelector<HTMLButtonElement>('.enviar')?.disabled).toBe(true);
      expect(c.el.querySelector('.enviar')?.textContent?.trim()).toBe('Enviando...');

      const peticion = c.http.expectOne(URL_API);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({
        nombre: 'Ana Pérez', telefono: '3001234567', correo: '', mensaje: 'Quiero información', consentimientoDatos: true,
        proyectoId: 7, loteId: 3, casaModeloId: 8, sitioWeb: '', idioma: 'es'
      });
      peticion.flush({ id: 1 });
      c.harness.detectChanges();

      expect(c.instancia.enviando()).toBe(false);
      expect(c.toast.toasts().map(t => [t.type, t.message])).toEqual([['success', '¡Solicitud enviada con éxito! Nos pondremos en contacto pronto.']]);
      expect(c.instancia.form.getRawValue()).toEqual({ nombre: '', telefono: '', correo: '', mensaje: '', consentimientoDatos: false, sitioWeb: '' });
    });

    it('el campo trampa va oculto para personas y lectores de pantalla, sin tabulación ni autocompletar', async () => {
      const c = await abrir(detalle());
      const trampa = c.el.querySelector<HTMLElement>('.campo-trampa')!;
      expect(trampa.getAttribute('aria-hidden')).toBe('true');
      const campo = trampa.querySelector('input')!;
      expect(campo.getAttribute('tabindex')).toBe('-1');
      expect(campo.getAttribute('autocomplete')).toBe('off');
      expect(campo.getAttribute('formcontrolname')).toBe('sitioWeb');
    });

    it('nunca manda ip ni userAgent; si un bot llena la trampa, sitioWeb viaja con su texto para que el backend lo descarte', async () => {
      const c = await abrir(detalle());
      llenar(c);
      c.instancia.form.controls.sitioWeb.setValue('http://spam.example');
      c.enviar();
      const peticion = c.http.expectOne(URL_API);
      expect(peticion.request.body.sitioWeb).toBe('http://spam.example');
      expect(peticion.request.body).not.toHaveProperty('userAgent');
      expect(peticion.request.body).not.toHaveProperty('ip');
      peticion.flush({});
    });

    it('sin lote ni villa manda esos campos en null', async () => {
      const c = await abrir(detalle());
      llenar(c);
      c.enviar();
      const peticion = c.http.expectOne(URL_API);
      expect(peticion.request.body.loteId).toBeNull();
      expect(peticion.request.body.casaModeloId).toBeNull();
      peticion.flush({});
    });

    it('mientras se envía, un segundo envío no repite la petición', async () => {
      const c = await abrir(detalle());
      llenar(c);
      c.enviar();
      c.enviar();
      const peticion = c.http.expectOne(URL_API);
      peticion.flush({});
    });

    it('si el servidor falla muestra el error, conserva lo escrito y permite reintentar', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const c = await abrir(detalle());
      llenar(c);
      c.enviar();
      c.http.expectOne(URL_API).flush('fallo', { status: 500, statusText: 'Error' });
      c.harness.detectChanges();

      expect(consola).toHaveBeenCalled();
      expect(c.toast.toasts().map(t => [t.type, t.message])).toEqual([['error', 'Hubo un error al enviar el mensaje. Inténtalo de nuevo.']]);
      expect(c.instancia.enviando()).toBe(false);
      expect(c.instancia.form.controls.nombre.value).toBe('Ana Pérez');
      expect(c.el.querySelector<HTMLButtonElement>('.enviar')?.disabled).toBe(false);
    });

    it('sin proyecto cargado no envía nada', async () => {
      const c = await abrir(null);
      c.instancia.enviar();
      c.http.expectNone(URL_API);
      expect(c.instancia.enviando()).toBe(false);
    });
  });

  it('sin contenido de contacto en el menú: el contacto siempre existe y no redirige', async () => {
    const { router } = await abrir(detalle());
    expect(router.url).toBe('/proyectos/7/contacto');
  });

  describe('invalido()', () => {
    it('solo es verdadero si el campo es inválido y ya se tocó o se editó', async () => {
      const { instancia } = await abrir(detalle());
      expect(instancia.invalido('nombre')).toBe(false);
      instancia.form.controls.nombre.markAsTouched();
      expect(instancia.invalido('nombre')).toBe(true);
      instancia.form.controls.nombre.setValue('Ana');
      expect(instancia.invalido('nombre')).toBe(false);
    });
  });
});
