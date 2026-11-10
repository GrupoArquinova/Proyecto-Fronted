import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { WhatsappModalComponent } from './whatsapp-modal.component';

function crear() {
  TestBed.configureTestingModule({ providers: [provideI18nPruebas()] });
  const fixture = TestBed.createComponent(WhatsappModalComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const abrir = () => {
    el.querySelector<HTMLButtonElement>('.whatsapp-btn-float')?.click();
    fixture.detectChanges();
  };
  const llenar = (nombre: string, telefono: string, correo: string, autorizo: boolean) => {
    const c = fixture.componentInstance;
    c.nombre = nombre;
    c.telefono = telefono;
    c.email = correo;
    c.autorizo = autorizo;
  };
  // El componente es OnPush: si se cambia algo desde el código (no por un evento de la pantalla) hay que avisarle
  const refrescar = () => {
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };
  return { fixture, el, c: fixture.componentInstance, abrir, llenar, refrescar };
}

describe('WhatsappModalComponent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('el botón flotante abre y cierra el formulario', () => {
    const { el, abrir, fixture } = crear();
    expect(el.querySelector('.whatsapp-modal-card')).toBeNull();
    expect(el.querySelector('.whatsapp-btn-float')?.getAttribute('aria-expanded')).toBe('false');

    abrir();
    expect(el.querySelector('.whatsapp-modal-card')).not.toBeNull();
    expect(el.querySelector('.whatsapp-btn-float')?.getAttribute('aria-expanded')).toBe('true');

    el.querySelector<HTMLButtonElement>('.close-btn')?.click();
    fixture.detectChanges();
    expect(el.querySelector('.whatsapp-modal-card')).toBeNull();
  });

  it('cerrar el formulario borra lo que se había escrito', () => {
    const { c, llenar } = crear();
    llenar('Ana', '300', 'a@a.co', true);
    c.isOpen = true;

    c.toggleModal();

    expect([c.nombre, c.telefono, c.email, c.autorizo, c.errorKey]).toEqual(['', '', '', false, '']);
  });

  it('si falta algún dato avisa y no abre WhatsApp', () => {
    const { c, el, abrir, llenar, refrescar } = crear();
    const abrirVentana = vi.spyOn(window, 'open').mockReturnValue(null);
    abrir();

    llenar('Ana', '', 'a@a.co', true);
    c.iniciarChat();
    refrescar();

    expect(c.errorKey).toBe('whatsappModal.errorCampos');
    expect(el.querySelector('.error-msg')?.textContent).toContain('complete todos los campos');
    expect(abrirVentana).not.toHaveBeenCalled();
  });

  it('si no autoriza el tratamiento de datos avisa y no abre WhatsApp', () => {
    const { c, llenar } = crear();
    const abrirVentana = vi.spyOn(window, 'open').mockReturnValue(null);

    llenar('Ana', '300 123 4567', 'a@a.co', false);
    c.iniciarChat();

    expect(c.errorKey).toBe('whatsappModal.errorAutorizo');
    expect(abrirVentana).not.toHaveBeenCalled();
  });

  it('con todo completo abre wa.me con el número de la empresa y el mensaje con los datos, y cierra el formulario', () => {
    const { c, el, abrir, llenar, refrescar } = crear();
    const abrirVentana = vi.spyOn(window, 'open').mockReturnValue(null);
    abrir();

    llenar('  Ana Ruiz ', ' 300 123 4567 ', ' ana@correo.com ', true);
    c.iniciarChat();
    refrescar();

    expect(abrirVentana).toHaveBeenCalledTimes(1);
    const [direccion, destino, caracteristicas] = abrirVentana.mock.calls[0] as [string, string, string];
    expect(destino).toBe('_blank');
    expect(caracteristicas).toBe('noopener,noreferrer');
    expect(direccion.startsWith(`https://wa.me/${environment.contacto.whatsapp}?text=`)).toBe(true);
    const mensaje = decodeURIComponent(direccion.split('?text=')[1]);
    expect(mensaje).toContain('Ana Ruiz');
    expect(mensaje).toContain('300 123 4567');
    expect(mensaje).toContain('ana@correo.com');
    expect(el.querySelector('.whatsapp-modal-card')).toBeNull();
    expect(c.nombre).toBe('');
  });

  it('el formulario se envía con el botón (submit) y deja de mostrar el aviso al completarlo bien', () => {
    const { c, el, abrir, llenar, refrescar } = crear();
    const abrirVentana = vi.spyOn(window, 'open').mockReturnValue(null);
    abrir();
    c.errorKey = 'whatsappModal.errorCampos';
    llenar('Ana', '300', 'a@a.co', true);

    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    refrescar();

    expect(abrirVentana).toHaveBeenCalledTimes(1);
    expect(c.errorKey).toBe('');
  });
});
