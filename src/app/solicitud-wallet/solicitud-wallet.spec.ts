import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TRANSLOCO_CONFIG, translocoConfig } from '@jsverse/transloco';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdiomaService } from '../core/services/idioma.service';
import { provideI18nPruebas } from '../i18n/pruebas';
import { SolicitudWallet } from './solicitud-wallet';

const URL = (r: { url: string }) => r.url.endsWith('/wallet/enviar-pase');

describe('SolicitudWallet (tarjeta de Google Wallet)', () => {
  let fixture: ComponentFixture<SolicitudWallet>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function crear() {
    TestBed.configureTestingModule({
      imports: [SolicitudWallet],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas(),
        { provide: TRANSLOCO_CONFIG, useValue: translocoConfig({ availableLangs: ['es', 'en'], defaultLang: 'es', fallbackLang: 'es', reRenderOnLangChange: true }) }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitudWallet);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const campo = () => el.querySelector<HTMLInputElement>('input')!;
  const boton = () => el.querySelector<HTMLButtonElement>('button')!;
  const estado = () => (el.querySelector('#wallet-estado')?.textContent ?? '').trim();

  function escribirYEnviar(correo: string) {
    campo().value = correo;
    campo().dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('se crea con su título, el campo de correo accesible y la nota de privacidad', () => {
    crear();
    expect(el.querySelector('h4')?.textContent).toContain('Llévanos en tu celular');
    expect(el.querySelector('label[for="wallet-correo"]')?.textContent).toContain('Tu correo electrónico');
    expect(campo().getAttribute('autocomplete')).toBe('email');
    expect(el.textContent).toContain('no lo guardamos');
    expect(el.querySelector('#wallet-estado')?.getAttribute('aria-live')).toBe('polite');
  });

  it('con un correo inválido o vacío no llama al servidor y avisa', () => {
    crear();
    for (const malo of ['', 'sin-arroba', 'a@b', 'a b@c.com']) {
      escribirYEnviar(malo);
      http.expectNone(URL);
      expect(estado()).toContain('Escribe un correo válido');
    }
    expect(campo().getAttribute('aria-invalid')).toBe('true');
  });

  it('envía el correo sin espacios sobrantes, deshabilita el botón mientras tanto y confirma al terminar', () => {
    crear();
    escribirYEnviar('  cliente@correo.com ');

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'cliente@correo.com' });
    expect(boton().disabled).toBe(true);
    expect(boton().textContent).toContain('Enviando');

    req.flush({ mensaje: 'Tarjeta enviada con éxito' });
    fixture.detectChanges();
    expect(boton().disabled).toBe(false);
    expect(campo().value).toBe('');
    expect(estado()).toContain('Revisa tu bandeja de entrada');
    expect(el.querySelector('#wallet-estado')?.classList.contains('ok')).toBe(true);
  });

  it('un segundo clic mientras envía no manda otra petición', () => {
    crear();
    escribirYEnviar('cliente@correo.com');
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    http.expectOne(URL).flush({});
  });

  it.each([
    [429, 'ya enviamos la tarjeta'],
    [503, 'no está disponible por ahora'],
    [400, 'correo válido'],
    [500, 'ocurrió un error'],
    [0, 'no pudimos conectar'],
  ])('si el servidor responde %s muestra un mensaje claro (sin texto técnico) y se puede reintentar', (codigo, texto) => {
    crear();
    escribirYEnviar('cliente@correo.com');

    http.expectOne(URL).flush({ mensaje: 'detalle interno del servidor' }, { status: codigo, statusText: 'x' });
    fixture.detectChanges();

    expect(estado().toLowerCase()).toContain(texto);
    expect(estado()).not.toContain('detalle interno');
    expect(el.querySelector('#wallet-estado')?.classList.contains('error')).toBe(true);
    expect(boton().disabled).toBe(false);
  });

  it('en inglés muestra los textos traducidos', async () => {
    crear();
    const idioma = TestBed.inject(IdiomaService);
    idioma.cambiar('en');
    await vi.waitFor(() => expect(idioma.idioma()).toBe('en'));
    fixture.detectChanges();
    expect(el.querySelector('h4')?.textContent).toContain('Take us with you');
    expect(boton().textContent).toContain('Send to my email');
  });
});
