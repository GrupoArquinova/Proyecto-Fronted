import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CloudinaryService } from '../../../core/services/cloudinary.service';
import { ToastService } from '../../../core/services/toast.service';
import { SubidaArchivoComponent } from './subida-archivo.component';

const archivo = (nombre: string, tipo: string, tamano = 1000) => {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: tamano });
  return f;
};

function crear(subir: (f: File) => unknown, entradas: Record<string, unknown> = {}) {
  const cloudinary = { subirArchivo: vi.fn(subir as never) };
  TestBed.configureTestingModule({ providers: [{ provide: CloudinaryService, useValue: cloudinary }] });
  const fixture = TestBed.createComponent(SubidaArchivoComponent);
  fixture.componentRef.setInput('etiqueta', 'Portada');
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const elegir = (...archivos: File[]) => {
    const input = el.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: archivos, configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  return { fixture, el, componente: fixture.componentInstance, cloudinary, elegir, toast: TestBed.inject(ToastService) };
}

const resultado = (url: string, tipo = 'image') => of({ url, resourceType: tipo });

describe('SubidaArchivoComponent', () => {
  it('muestra la etiqueta, qué tipos acepta y se limita a un archivo por defecto', () => {
    const { el } = crear(() => resultado('x'), { tipos: ['imagen', 'pdf'] });

    expect(el.textContent).toContain('Portada');
    expect(el.textContent).toContain('Elegir archivo (imagen, PDF)');
    expect(el.querySelector('input')?.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf');
    expect(el.querySelector('input')?.multiple).toBe(false);
  });

  it('sube el archivo, guarda la URL y muestra la vista previa con su enlace', () => {
    const { el, componente, cloudinary, elegir } = crear(() => resultado('https://res.cloudinary.com/n/foto.png'));

    elegir(archivo('foto.png', 'image/png'));

    expect(cloudinary.subirArchivo).toHaveBeenCalledTimes(1);
    expect(componente.url()).toBe('https://res.cloudinary.com/n/foto.png');
    expect(componente.subiendo()).toBe(false);
    expect(el.querySelector('.previa img')).not.toBeNull();
    expect(el.querySelector('.previa a')?.textContent).toContain('Ver archivo subido');
  });

  it('la vista previa distingue imagen, video, PDF y un archivo de tipo desconocido', () => {
    const { fixture, el, componente } = crear(() => resultado('x'));

    componente.url.set('https://x.test/video.mp4');
    fixture.detectChanges();
    expect(componente.tipoActual()).toBe('video');
    expect(el.querySelector('.icono')?.textContent).toContain('▶');

    componente.url.set('https://x.test/ficha.pdf');
    fixture.detectChanges();
    expect(componente.tipoActual()).toBe('pdf');
    expect(el.querySelector('.icono')?.textContent).toContain('📄');

    componente.url.set('https://res.cloudinary.com/n/image/upload/v1/foto');
    expect(componente.tipoActual()).toBe('imagen');

    componente.url.set('https://x.test/otro.bin');
    expect(componente.tipoActual()).toBeNull();
  });

  it('un archivo que no es del tipo permitido o es muy pesado se rechaza sin subirlo', () => {
    const { el, cloudinary, elegir, componente } = crear(() => resultado('x'), { tipos: ['imagen'] });

    elegir(archivo('ficha.pdf', 'application/pdf'));
    expect(cloudinary.subirArchivo).not.toHaveBeenCalled();
    expect(el.querySelector('.error')?.textContent).toContain('no es válido');

    elegir(archivo('enorme.png', 'image/png', 50 * 1024 * 1024));
    expect(cloudinary.subirArchivo).not.toHaveBeenCalled();
    expect(componente.error()).toContain('máximo para imágenes es 10 MB');
  });

  it('sin elegir ningún archivo no hace nada', () => {
    const { cloudinary, elegir } = crear(() => resultado('x'));

    elegir();

    expect(cloudinary.subirArchivo).not.toHaveBeenCalled();
  });

  it('mientras sube muestra el nombre y bloquea el campo', () => {
    const pendiente = new Subject<{ url: string; resourceType: string }>();
    const { fixture, el, componente, elegir } = crear(() => pendiente);

    elegir(archivo('foto.png', 'image/png'));

    expect(componente.subiendo()).toBe(true);
    expect(el.querySelector('.spinner')).not.toBeNull();
    expect(el.textContent).toContain('Subiendo foto.png');
    expect(el.querySelector('input')?.disabled).toBe(true);

    pendiente.next({ url: 'https://x.test/foto.png', resourceType: 'image' });
    pendiente.complete();
    fixture.detectChanges();
    expect(componente.subiendo()).toBe(false);
  });

  it('con varios archivos los sube uno tras otro y emite cada uno; con limpiarAlSubir no guarda la URL', () => {
    const { componente, cloudinary, elegir } = crear(f => resultado(`https://x.test/${(f as File).name}`), { multiple: true, limpiarAlSubir: true });
    const subidos: { url: string; nombre: string }[] = [];
    componente.subido.subscribe(s => subidos.push(s));

    elegir(archivo('a.png', 'image/png'), archivo('b.png', 'image/png'));

    expect(cloudinary.subirArchivo).toHaveBeenCalledTimes(2);
    expect(subidos).toEqual([{ url: 'https://x.test/a.png', nombre: 'a.png' }, { url: 'https://x.test/b.png', nombre: 'b.png' }]);
    expect(componente.url()).toBe('');
    expect(componente.subiendo()).toBe(false);
  });

  it('con varios archivos, uno inválido frena todo antes de subir ninguno', () => {
    const { cloudinary, elegir, componente } = crear(() => resultado('x'), { multiple: true });

    elegir(archivo('a.png', 'image/png'), archivo('mal.pdf', 'application/pdf'));

    expect(cloudinary.subirArchivo).not.toHaveBeenCalled();
    expect(componente.error()).toContain('mal.pdf');
  });

  it('si la subida falla avisa, deja de cargar y muestra el motivo', () => {
    const { el, componente, toast, elegir } = crear(() => throwError(() => new Error('sin red')));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    elegir(archivo('foto.png', 'image/png'));

    expect(toast.toasts().some(t => t.message === 'No se pudo subir el archivo')).toBe(true);
    expect(componente.subiendo()).toBe(false);
    expect(el.querySelector('.error')?.textContent).toContain('No se pudo subir foto.png');
    consola.mockRestore();
  });

  it('"Quitar" borra el archivo y deja el campo listo para otro', () => {
    const { fixture, el, componente } = crear(() => resultado('x'));
    componente.url.set('https://x.test/foto.png');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('.quitar')?.click();
    fixture.detectChanges();

    expect(componente.url()).toBe('');
    expect(el.querySelector('.zona')).not.toBeNull();
  });

  it('muestra la ayuda mientras no hay archivo', () => {
    const { el } = crear(() => resultado('x'), { ayuda: 'Máximo 10 MB' });
    expect(el.querySelector('.ayuda')?.textContent).toContain('Máximo 10 MB');
  });
});
