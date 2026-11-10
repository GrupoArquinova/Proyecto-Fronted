import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BloqueZonasComponent } from './bloque-zonas.component';
import { AsistenteProyectoService } from '../../asistente-proyecto.service';
import { SubidaArchivoComponent } from '../../../../../shared/components/subida-archivo/subida-archivo.component';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ZonaComun } from '../../../../../core/models/zona-comun.models';
import { environment } from '../../../../../../environments/environment';

const ZONAS = `${environment.apiUrl}/zonas-comunes`;
const IMAGENES = `${environment.apiUrl}/zonas-comunes-imagenes`;

describe('BloqueZonasComponent', () => {
  let http: HttpTestingController;

  function crear(zonas: Partial<ZonaComun>[] = [], conProyecto = true) {
    TestBed.configureTestingModule({
      imports: [BloqueZonasComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    if (conProyecto) asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.zonas.set(structuredClone(zonas) as ZonaComun[]);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BloqueZonasComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const escribir = (nombre: string, valor: string) => {
      const campo = el.querySelector(`[formControlName="${nombre}"]`) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    const enviar = () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const subidas = () => fixture.debugElement.queryAll(By.directive(SubidaArchivoComponent)).map(d => d.componentInstance as SubidaArchivoComponent);
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, enviar, subidas };
  }

  const piscina = (imagenes: ZonaComun["imagenes"] = []): Partial<ZonaComun> => ({ id: 1, proyectoId: 6, nombre: 'Piscina', descripcion: 'Para todos', imagenes });
  const avisos = () => TestBed.inject(ToastService).toasts();
  const confirmar = async (acepta: boolean) => {
    const dialogo = TestBed.inject(ConfirmDialogService);
    if (acepta) dialogo.confirm(); else dialogo.cancel();
    await new Promise(r => setTimeout(r, 0));
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('sin zonas muestra el mensaje vacío', () => {
    const { el } = crear();

    expect(el.querySelector('.vacio')!.textContent).toContain('Todavía no hay amenidades');
  });

  it('no guarda si falta el nombre ni si el proyecto aún no existe', () => {
    const sinNombre = crear();
    sinNombre.enviar();
    http.expectNone(ZONAS);
    expect(sinNombre.componente.form.touched).toBe(true);
    TestBed.resetTestingModule();

    const sinProyecto = crear([], false);
    sinProyecto.escribir('nombre', 'Piscina');
    sinProyecto.enviar();
    http.expectNone(ZONAS);
  });

  it('crea la zona con el nombre recortado, la añade sin fotos y limpia el formulario', () => {
    const { escribir, enviar, asistente, componente, el, refrescar } = crear();

    escribir('nombre', '  Piscina  ');
    escribir('descripcion', ' Para adultos y niños ');
    enviar();

    const peticion = http.expectOne(ZONAS);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ proyectoId: 6, nombre: 'Piscina', descripcion: 'Para adultos y niños', publicado: true, activo: true });
    expect(el.querySelector('form button')!.textContent).toContain('Agregando...');
    peticion.flush({ id: 9, proyectoId: 6, nombre: 'Piscina' });
    refrescar();

    expect(asistente.zonas()).toEqual([{ id: 9, proyectoId: 6, nombre: 'Piscina', imagenes: [] }]);
    expect(componente.form.getRawValue()).toEqual({ nombre: '', descripcion: '' });
    expect(el.querySelectorAll('.tarjeta').length).toBe(1);
    expect(componente.guardando()).toBe(false);
  });

  it('un 409 avisa que ya hay una zona con ese nombre', () => {
    const { escribir, enviar, el, refrescar } = crear();

    escribir('nombre', 'Piscina');
    enviar();
    http.expectOne(ZONAS).flush(null, { status: 409, statusText: 'Conflict' });
    refrescar();

    expect(el.querySelector('.error')!.textContent).toContain('Ya hay una zona con ese nombre');
    expect(avisos().length).toBe(0);
  });

  it('otro error muestra un aviso de que no se pudo crear', () => {
    const { escribir, enviar, componente } = crear();

    escribir('nombre', 'Piscina');
    enviar();
    http.expectOne(ZONAS).flush(null, { status: 500, statusText: 'Error' });

    expect(avisos()[0].message).toContain('No se pudo crear la zona');
    expect(componente.guardando()).toBe(false);
    expect(componente.duplicada()).toBe(false);
  });

  it('muestra cada zona con su descripción y fotos, marcando la principal', () => {
    const { el } = crear([
      piscina([
        { id: 1, zonaComunId: 1, imagenUrl: 'https://cdn.test/a.jpg', esPrincipal: true, titulo: 'Vista' },
        { id: 2, zonaComunId: 1, imagenUrl: 'https://cdn.test/b.jpg', esPrincipal: false }
      ]),
      { id: 2, proyectoId: 6, nombre: 'Sendero' }
    ]);

    const tarjetas = el.querySelectorAll('.tarjeta');
    expect(tarjetas.length).toBe(2);
    expect(tarjetas[0].querySelector('.sub')!.textContent).toBe('Para todos');
    expect(tarjetas[1].querySelector('.sub')).toBeNull();
    const fotos = tarjetas[0].querySelectorAll('.fotos li');
    expect(fotos.length).toBe(2);
    expect(fotos[0].classList.contains('principal')).toBe(true);
    expect(fotos[0].querySelector('.etiqueta')!.textContent).toBe('Principal');
    expect((fotos[0].querySelector('img') as HTMLImageElement).alt).toBe('Vista');
    expect((fotos[1].querySelector('img') as HTMLImageElement).alt).toBe('Piscina');
    // Solo la foto no principal ofrece "Principal"
    expect(fotos[0].querySelectorAll('.foto-acciones button').length).toBe(1);
    expect(fotos[1].querySelectorAll('.foto-acciones button').length).toBe(2);
  });

  it('eliminar una zona pide confirmación y la quita del asistente', async () => {
    const { el, asistente, refrescar } = crear([piscina()]);

    (el.querySelector('button[aria-label="Eliminar Piscina"]') as HTMLButtonElement).click();
    await confirmar(true);
    const peticion = http.expectOne(`${ZONAS}/1`);
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null);
    refrescar();

    expect(asistente.zonas()).toEqual([]);
    expect(el.querySelector('.vacio')).not.toBeNull();
  });

  it('cancelar la confirmación no elimina la zona; un fallo del servidor la conserva y avisa', async () => {
    const { el, asistente } = crear([piscina()]);

    (el.querySelector('button[aria-label="Eliminar Piscina"]') as HTMLButtonElement).click();
    await confirmar(false);
    http.expectNone(`${ZONAS}/1`);

    (el.querySelector('button[aria-label="Eliminar Piscina"]') as HTMLButtonElement).click();
    await confirmar(true);
    http.expectOne(`${ZONAS}/1`).flush(null, { status: 500, statusText: 'Error' });

    expect(asistente.zonas().length).toBe(1);
    expect(avisos()[0].message).toContain('No se pudo eliminar la zona');
  });

  it('una zona sin id no se puede eliminar ni recibir fotos', async () => {
    const { componente } = crear();
    const sinId = { proyectoId: 6, nombre: 'Sin id' } as ZonaComun;

    await componente.eliminar(sinId);
    componente.agregarFoto(sinId, 'https://cdn.test/x.jpg');
    componente.hacerPrincipal(sinId, { id: 1, zonaComunId: 1, imagenUrl: 'x' });
    componente.quitarFoto(sinId, { id: 1, zonaComunId: 1, imagenUrl: 'x' });

    expect(TestBed.inject(ConfirmDialogService).isOpen()).toBe(false);
    http.expectNone(IMAGENES);
  });

  describe('fotos', () => {
    it('la primera foto de una zona se guarda como principal con orden 1', () => {
      const { subidas, asistente, refrescar, el } = crear([piscina()]);

      subidas()[0].subido.emit({ url: 'https://cdn.test/a.jpg', nombre: 'a.jpg' });
      const peticion = http.expectOne(IMAGENES);
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ zonaComunId: 1, imagenUrl: 'https://cdn.test/a.jpg', orden: 1, esPrincipal: true });
      peticion.flush({ id: 5, zonaComunId: 1, imagenUrl: 'https://cdn.test/a.jpg', orden: 1, esPrincipal: true });
      refrescar();

      expect(asistente.zonas()[0].imagenes!.length).toBe(1);
      expect(el.querySelectorAll('.fotos li').length).toBe(1);
    });

    it('las siguientes fotos no son principales y siguen el orden más alto', () => {
      const { subidas, asistente } = crear([piscina([{ id: 5, zonaComunId: 1, imagenUrl: 'a', orden: 3, esPrincipal: true }])]);

      subidas()[0].subido.emit({ url: 'https://cdn.test/b.jpg', nombre: 'b.jpg' });
      const peticion = http.expectOne(IMAGENES);
      expect(peticion.request.body).toMatchObject({ orden: 4, esPrincipal: false });
      peticion.flush({ id: 6, zonaComunId: 1, imagenUrl: 'https://cdn.test/b.jpg', orden: 4, esPrincipal: false });

      expect(asistente.zonas()[0].imagenes!.map(f => f.id)).toEqual([5, 6]);
    });

    it('si falla guardar la foto avisa que se subió pero no se asoció', () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { subidas, asistente } = crear([piscina()]);

      subidas()[0].subido.emit({ url: 'https://cdn.test/a.jpg', nombre: 'a.jpg' });
      http.expectOne(IMAGENES).flush(null, { status: 500, statusText: 'Error' });

      expect(avisos()[0].message).toContain('no se pudo asociar a la zona');
      expect(consola).toHaveBeenCalled();
      expect(asistente.zonas()[0].imagenes).toEqual([]);
    });

    it('"Principal" marca esa foto como principal y desmarca las demás', () => {
      const { el, asistente, refrescar } = crear([piscina([
        { id: 1, zonaComunId: 1, imagenUrl: 'a', esPrincipal: true },
        { id: 2, zonaComunId: 1, imagenUrl: 'b', esPrincipal: false }
      ])]);

      (el.querySelectorAll('.fotos li')[1].querySelector('.foto-acciones button') as HTMLButtonElement).click();
      const peticion = http.expectOne(`${IMAGENES}/2/principal`);
      expect(peticion.request.method).toBe('PATCH');
      peticion.flush({ id: 2, zonaComunId: 1, imagenUrl: 'b', esPrincipal: true });
      refrescar();

      expect(asistente.zonas()[0].imagenes!.map(f => f.esPrincipal)).toEqual([false, true]);
      expect(el.querySelectorAll('.fotos li')[1].classList.contains('principal')).toBe(true);
    });

    it('si falla marcar la principal se avisa y todo queda igual', () => {
      const { el, asistente } = crear([piscina([{ id: 2, zonaComunId: 1, imagenUrl: 'b', esPrincipal: false }])]);

      (el.querySelector('.foto-acciones button') as HTMLButtonElement).click();
      http.expectOne(`${IMAGENES}/2/principal`).flush(null, { status: 500, statusText: 'Error' });

      expect(avisos()[0].message).toContain('No se pudo cambiar la foto principal');
      expect(asistente.zonas()[0].imagenes![0].esPrincipal).toBe(false);
    });

    it('"Quitar" elimina la foto en el servidor y de la zona; si falla, avisa', () => {
      const { el, asistente, refrescar } = crear([piscina([
        { id: 1, zonaComunId: 1, imagenUrl: 'a', esPrincipal: true },
        { id: 2, zonaComunId: 1, imagenUrl: 'b', esPrincipal: false }
      ])]);

      const quitar = (i: number) => {
        const botones = el.querySelectorAll('.fotos li')[i].querySelectorAll('.foto-acciones button');
        (botones[botones.length - 1] as HTMLButtonElement).click();
      };
      quitar(1);
      const peticion = http.expectOne(`${IMAGENES}/2`);
      expect(peticion.request.method).toBe('DELETE');
      peticion.flush(null);
      refrescar();
      expect(asistente.zonas()[0].imagenes!.map(f => f.id)).toEqual([1]);

      quitar(0);
      http.expectOne(`${IMAGENES}/1`).flush(null, { status: 500, statusText: 'Error' });
      expect(asistente.zonas()[0].imagenes!.length).toBe(1);
      expect(avisos()[0].message).toContain('No se pudo quitar la foto');
    });

    it('agregar foto a una zona sin lista de imágenes la trata como vacía', () => {
      const { subidas, asistente } = crear([{ id: 3, proyectoId: 6, nombre: 'Sendero' }]);

      subidas()[0].subido.emit({ url: 'https://cdn.test/s.jpg', nombre: 's.jpg' });
      const peticion = http.expectOne(IMAGENES);
      expect(peticion.request.body).toMatchObject({ zonaComunId: 3, orden: 1, esPrincipal: true });
      peticion.flush({ id: 7, zonaComunId: 3, imagenUrl: 'https://cdn.test/s.jpg', orden: 1, esPrincipal: true });

      expect(asistente.zonas()[0].imagenes!.length).toBe(1);
    });
  });
});
