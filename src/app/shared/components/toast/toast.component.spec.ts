import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  it('dibuja cada aviso con su tipo y el botón × lo quita', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const servicio = TestBed.inject(ToastService);
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    expect(el.querySelectorAll('.toast').length).toBe(0);

    servicio.showSuccess('Guardado');
    servicio.showError('Falló');
    fixture.detectChanges();

    const avisos = el.querySelectorAll('.toast');
    expect(avisos.length).toBe(2);
    expect(avisos[0].classList.contains('success')).toBe(true);
    expect(avisos[0].textContent).toContain('Guardado');
    expect(avisos[1].classList.contains('error')).toBe(true);

    el.querySelector<HTMLButtonElement>('.close-btn')?.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.toast').length).toBe(1);
    expect(el.querySelector('.toast')?.textContent).toContain('Falló');
  });
});
