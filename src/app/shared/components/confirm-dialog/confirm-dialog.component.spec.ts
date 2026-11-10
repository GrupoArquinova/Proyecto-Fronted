import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

function crear() {
  const fixture = TestBed.createComponent(ConfirmDialogComponent);
  const servicio = TestBed.inject(ConfirmDialogService);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, servicio, el };
}

describe('ConfirmDialogComponent', () => {
  it('cerrado no dibuja nada', () => {
    const { el } = crear();
    expect(el.querySelector('.cd-card')).toBeNull();
  });

  it('abierto muestra título, mensaje y los dos botones con sus textos', () => {
    const { fixture, servicio, el } = crear();

    servicio.open({ title: 'Eliminar amenidad', message: '¿Seguro?', confirmText: 'Sí, eliminar', cancelText: 'No' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(el.querySelector('.cd-title')?.textContent).toContain('Eliminar amenidad');
    expect(el.querySelector('.cd-message')?.textContent).toContain('¿Seguro?');
    expect(el.querySelector('.cd-btn--cancel')?.textContent).toContain('No');
    expect(el.querySelector('.cd-btn--danger')?.textContent).toContain('Sí, eliminar');
  });

  it('el icono cambia según el tipo (danger, warning, info)', () => {
    const { fixture, servicio, el } = crear();

    for (const tipo of ['danger', 'warning', 'info'] as const) {
      servicio.open({ title: 't', message: 'm', type: tipo });
      fixture.detectChanges();
      expect(el.querySelector(`.cd-icon--${tipo} svg`)).not.toBeNull();
      expect(el.querySelectorAll('.cd-icon svg').length).toBe(1);
      expect(el.querySelector(`.cd-btn--${tipo}`)).not.toBeNull();
      servicio.cancel();
      fixture.detectChanges();
    }
  });

  it('el botón de confirmar responde true y el de cancelar responde false', async () => {
    const { fixture, servicio, el } = crear();

    const si = servicio.open({ title: 't', message: 'm' });
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.cd-btn--danger')?.click();
    fixture.detectChanges();
    expect(await si).toBe(true);
    expect(el.querySelector('.cd-card')).toBeNull();

    const no = servicio.open({ title: 't', message: 'm' });
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.cd-btn--cancel')?.click();
    expect(await no).toBe(false);
  });

  it('tocar el fondo oscuro cancela, pero tocar dentro de la tarjeta no', async () => {
    const { fixture, servicio, el } = crear();

    const respuesta = servicio.open({ title: 't', message: 'm' });
    fixture.detectChanges();
    el.querySelector<HTMLElement>('.cd-card')?.click();
    fixture.detectChanges();
    expect(servicio.isOpen()).toBe(true);

    el.querySelector<HTMLElement>('.cd-backdrop')?.click();
    expect(await respuesta).toBe(false);
    expect(servicio.isOpen()).toBe(false);
  });
});
