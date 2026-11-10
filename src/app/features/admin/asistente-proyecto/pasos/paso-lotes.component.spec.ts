import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasoLotesComponent } from './paso-lotes.component';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Lote } from '../../../../core/models/lote.models';
import { environment } from '../../../../../environments/environment';

const LOTES = `${environment.apiUrl}/lotes`;

const ETAPAS = [
  { id: 1, proyectoId: 6, nombre: 'Etapa 1', orden: 1 },
  { id: 2, proyectoId: 6, nombre: 'Etapa 2', orden: 2 },
];

describe('PasoLotesComponent', () => {
  let http: HttpTestingController;

  function crear(opciones: { etapas?: unknown[]; lotes?: Partial<Lote>[] } = {}) {
    TestBed.configureTestingModule({
      imports: [PasoLotesComponent],
      providers: [AsistenteProyectoService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const asistente = TestBed.inject(AsistenteProyectoService);
    asistente.fijarProyecto({ id: 6, empresaId: 1, nombre: 'Los Andes' });
    asistente.etapas.set((opciones.etapas ?? ETAPAS) as never);
    asistente.lotes.set((opciones.lotes ?? []) as Lote[]);
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PasoLotesComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const refrescar = () => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const escribir = (campo: HTMLInputElement, valor: string) => {
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    /** Campos del generador, en el orden del formulario: prefijo, desde, cantidad, área. */
    const generador = () => Array.from(el.querySelectorAll('section[aria-label="Generar lotes"] input')) as HTMLInputElement[];
    const generar = (cantidad: string, area: string, prefijo?: string) => {
      const [campoPrefijo, , campoCantidad, campoArea] = generador();
      if (prefijo !== undefined) escribir(campoPrefijo, prefijo);
      escribir(campoCantidad, cantidad);
      escribir(campoArea, area);
      (el.querySelector('.generar') as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    const filas = () => Array.from(el.querySelectorAll('.fila-tabla')) as HTMLElement[];
    const codigos = () => fixture.componentInstance.filas().map(f => f.codigo);
    const boton = (texto: string) => Array.from(el.querySelectorAll('button')).find(b => b.textContent!.includes(texto)) as HTMLButtonElement;
    return { fixture, componente: fixture.componentInstance, asistente, el, refrescar, escribir, generador, generar, filas, codigos, boton };
  }

  const avisos = () => TestBed.inject(ToastService).toasts();

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('sin etapas', () => {
    it('pide crear una etapa y no muestra el generador', () => {
      const { el } = crear({ etapas: [] });

      expect(el.querySelector('.aviso')!.textContent).toContain('Primero crea al menos una etapa');
      expect(el.querySelector('section[aria-label="Generar lotes"]')).toBeNull();
      expect(el.querySelector('.vacio')!.textContent).toContain('Todavía no hay lotes guardados');
    });
  });

  describe('generador', () => {
    it('arranca con la primera etapa, el prefijo LT- y empezando en 1', () => {
      const { componente, generador } = crear();

      expect(componente.etapaId()).toBe(1);
      expect(componente.prefijo()).toBe('LT-');
      expect(componente.desde()).toBe(1);
      expect(generador().length).toBe(4);
    });

    it('sugiere el siguiente número libre según los lotes ya guardados de la etapa y el prefijo', () => {
      const { componente } = crear({ lotes: [
        { id: 1, codigo: 'LT-01', etapaId: 1 }, { id: 2, codigo: 'LT-07', etapaId: 1 }, { id: 3, codigo: 'LT-30', etapaId: 2 }
      ] });

      expect(componente.desde()).toBe(8);
      componente.cambiarEtapa(2);
      expect(componente.etapaId()).toBe(2);
      expect(componente.desde()).toBe(31);
      componente.cambiarPrefijo('MZ-');
      expect(componente.prefijo()).toBe('MZ-');
      expect(componente.desde()).toBe(1);
    });

    it('sin área avisa que debe escribirla y no genera filas', () => {
      const { el, fixture, filas } = crear();

      (el.querySelector('.generar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(el.querySelector('section[aria-label="Generar lotes"] .error')!.textContent).toContain('Escribe el área de los lotes');
      expect(filas().length).toBe(0);
    });

    it('con cantidad cero avisa que debe escribir cuántos lotes quiere', () => {
      const { generar, el } = crear();

      generar('0', '300');

      expect(el.querySelector('.error')!.textContent).toContain('Escribe cuántos lotes quieres generar');
    });

    it('sin etapa elegida avisa que debe elegir una', () => {
      const { componente } = crear();

      componente.etapaId.set(0);
      componente.generar();

      expect(componente.errorGeneracion()).toBe('Elige una etapa.');
      expect(componente.filas().length).toBe(0);
    });

    it('genera las filas con códigos consecutivos y las muestra en la tabla', async () => {
      const { generar, codigos, el, componente, fixture, filas } = crear();

      generar('3', '300');
      await fixture.whenStable();
      expect(filas().map(f => (f.querySelector('input[aria-label="Código"]') as HTMLInputElement).value)).toEqual(['LT-01', 'LT-02', 'LT-03']);

      expect(codigos()).toEqual(['LT-01', 'LT-02', 'LT-03']);
      expect(el.textContent).toContain('Por guardar (3)');
      expect(componente.errorGeneracion()).toBe('');
      expect(el.querySelector('.fila-tabla .etapa')!.textContent).toBe('Etapa 1');
    });

    it('una segunda tanda se suma a las filas pendientes sin repetir claves', () => {
      const { generar, codigos, componente } = crear();

      generar('2', '300');
      componente.desde.set(3);
      generar('2', '300');

      expect(codigos()).toEqual(['LT-01', 'LT-02', 'LT-03', 'LT-04']);
      expect(new Set(componente.filas().map(f => f.clave)).size).toBe(4);
    });

    it('marca en rojo las filas cuyo código ya existe en la etapa y bloquea el guardado', () => {
      const { generar, componente, filas, boton, el, refrescar } = crear({ lotes: [{ id: 1, codigo: 'LT-02', etapaId: 1 }] });

      componente.desde.set(1);
      generar('3', '300');
      refrescar();

      expect(componente.repetidas().size).toBe(1);
      expect(filas()[1].classList.contains('con-error')).toBe(true);
      expect(el.textContent).toContain('Este código ya existe en la etapa.');
      expect(boton('Guardar 3 lotes').disabled).toBe(true);
    });
  });

  describe('edición de filas', () => {
    it('al cambiar un código y salir del campo, las filas siguientes de la etapa continúan la numeración', () => {
      const { generar, filas, codigos, escribir, refrescar } = crear();
      generar('4', '300');

      const campo = filas()[1].querySelector('input[aria-label="Código"]') as HTMLInputElement;
      escribir(campo, 'LT-100');
      campo.dispatchEvent(new Event('change'));
      refrescar();

      expect(codigos()).toEqual(['LT-01', 'LT-100', 'LT-101', 'LT-102']);
    });

    it('mientras se escribe el código solo cambia esa fila (renumera al salir del campo)', () => {
      const { generar, filas, codigos, escribir } = crear();
      generar('3', '300');

      escribir(filas()[0].querySelector('input[aria-label="Código"]') as HTMLInputElement, 'LT-50');

      expect(codigos().slice(1)).toEqual(['LT-02', 'LT-03']);
    });

    it('editar el área o el estado de una fila actualiza solo esa fila y limpia su error', () => {
      const { generar, componente, filas, escribir, fixture } = crear();
      generar('2', '300');
      componente.filas.update(l => l.map(f => ({ ...f, error: 'No se pudo guardar.' })));

      escribir(filas()[0].querySelector('input[aria-label="Área"]') as HTMLInputElement, '450');
      const estado = filas()[0].querySelector('select[aria-label="Estado"]') as HTMLSelectElement;
      estado.value = estado.options[2].value;
      estado.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const [primera, segunda] = componente.filas();
      expect(primera.areaM2).toBe(450);
      expect(primera.estadoId).toBe(3);
      expect(primera.error).toBeUndefined();
      expect(segunda.areaM2).toBe(300);
      expect(segunda.error).toBe('No se pudo guardar.');
    });

    it('un código vacío marca la fila como inválida y no se puede guardar', () => {
      const { generar, filas, escribir, boton, fixture } = crear();
      generar('2', '300');

      const campo = filas()[0].querySelector('input[aria-label="Código"]') as HTMLInputElement;
      escribir(campo, '   ');
      fixture.detectChanges();

      expect(campo.classList.contains('invalido')).toBe(true);
      expect(boton('Guardar 2 lotes').disabled).toBe(true);
    });

    it('quitar una fila la elimina de la tabla y descartar vacía la tabla', () => {
      const { generar, filas, el, boton, fixture } = crear();
      generar('3', '300');

      (filas()[0].querySelector('.quitar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(filas().length).toBe(2);

      boton('Descartar').click();
      fixture.detectChanges();
      expect(filas().length).toBe(0);
      expect(el.querySelector('section[aria-label="Lotes por guardar"]')).toBeNull();
    });
  });

  describe('guardado', () => {
    const respuesta = (cuerpo: { codigo: string; etapaId: number }, id: number) =>
      ({ id, codigo: cuerpo.codigo, areaM2: 300, estadoNombre: 'DISPONIBLE', etapaId: cuerpo.etapaId });

    it('guarda las filas una a una, las pasa a la lista de guardados y avisa del éxito', () => {
      const { generar, boton, componente, asistente, fixture, el } = crear();
      generar('2', '300');

      boton('Guardar 2 lotes').click();
      fixture.detectChanges();
      expect(componente.guardando()).toBe(true);
      expect(componente.total()).toBe(2);
      expect(el.textContent).toContain('Guardando 0 de 2...');

      // Se pide una por una: hasta responder la primera no sale la segunda
      const primera = http.expectOne(LOTES);
      expect(primera.request.method).toBe('POST');
      expect(primera.request.body).toEqual({ etapaId: 1, estadoId: 1, codigo: 'LT-01', areaM2: 300, activo: true });
      primera.flush(respuesta(primera.request.body, 21));
      expect(componente.progreso()).toBe(1);
      const segunda = http.expectOne(LOTES);
      segunda.flush(respuesta(segunda.request.body, 22));
      fixture.detectChanges();

      expect(componente.guardando()).toBe(false);
      expect(componente.filas()).toEqual([]);
      expect(asistente.lotes().map(l => l.codigo)).toEqual(['LT-01', 'LT-02']);
      expect(asistente.lotes()[0]).toMatchObject({ proyectoId: 6, etapaNombre: 'Etapa 1' });
      expect(avisos()[0]).toMatchObject({ type: 'success', message: '2 lotes guardados' });
      expect(el.querySelector('.grupo-titulo')!.textContent).toContain('Etapa 1');
      expect(componente.desde()).toBe(3);
    });

    it('conserva el nombre de etapa que devuelve el servidor', () => {
      const { generar, boton, asistente } = crear();
      generar('1', '300');

      boton('Guardar 1 lotes').click();
      const peticion = http.expectOne(LOTES);
      peticion.flush({ ...respuesta(peticion.request.body, 30), etapaNombre: 'Etapa Servidor' });

      expect(asistente.lotes()[0].etapaNombre).toBe('Etapa Servidor');
    });

    it('las filas que fallan se quedan en la tabla con su motivo (409, 400 y otros) y se avisa cuántas', () => {
      const { generar, boton, componente, asistente, fixture, filas, el } = crear();
      generar('4', '300');

      boton('Guardar 4 lotes').click();
      http.expectOne(LOTES).flush(null, { status: 409, statusText: 'Conflict' });
      http.expectOne(LOTES).flush(null, { status: 400, statusText: 'Bad Request' });
      http.expectOne(LOTES).flush(null, { status: 500, statusText: 'Error' });
      const ultima = http.expectOne(LOTES);
      ultima.flush(respuesta(ultima.request.body, 40));
      fixture.detectChanges();

      expect(componente.guardando()).toBe(false);
      expect(asistente.lotes().map(l => l.codigo)).toEqual(['LT-04']);
      expect(componente.filas().map(f => f.error)).toEqual([
        'Ya existe un lote con ese código en la etapa.',
        'Datos no válidos. Revisa el código y el área.',
        'No se pudo guardar. Inténtalo de nuevo.'
      ]);
      expect(filas().length).toBe(3);
      expect(el.textContent).toContain('Datos no válidos. Revisa el código y el área.');
      expect(avisos()[0]).toMatchObject({ type: 'error', message: '3 lotes no se pudieron guardar. Revisa los avisos en la tabla.' });
    });

    it('al corregir una fila que falló, el aviso se limpia y se puede reintentar', () => {
      const { generar, boton, componente, filas, escribir, fixture } = crear();
      generar('1', '300');
      boton('Guardar 1 lotes').click();
      http.expectOne(LOTES).flush(null, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(componente.filas()[0].error).toBeDefined();

      escribir(filas()[0].querySelector('input[aria-label="Código"]') as HTMLInputElement, 'LT-09');
      fixture.detectChanges();
      expect(componente.filas()[0].error).toBeUndefined();

      boton('Guardar 1 lotes').click();
      const peticion = http.expectOne(LOTES);
      expect(peticion.request.body.codigo).toBe('LT-09');
      peticion.flush(respuesta(peticion.request.body, 50));
      expect(componente.filas().length).toBe(0);
    });

    it('guardar sin filas válidas no hace ninguna petición', () => {
      const { componente } = crear();

      componente.guardar();

      http.expectNone(LOTES);
      expect(componente.guardando()).toBe(false);
    });
  });

  describe('lotes guardados', () => {
    const guardados: Partial<Lote>[] = [
      { id: 1, codigo: 'LT-01', etapaId: 1, etapaNombre: 'Etapa 1', areaM2: 1100, estadoNombre: 'RESERVADO' },
      { id: 2, codigo: 'LT-02', etapaId: 1, etapaNombre: 'Etapa 1', areaM2: 420.5, estadoId: 1 },
      { id: 3, codigo: 'LT-03', areaM2: 300, estadoNombre: 'VENDIDO' },
    ];

    it('agrupa por etapa (con "Sin etapa" para los huérfanos) y muestra área y estado', () => {
      const { el, componente } = crear({ lotes: guardados });

      const titulos = Array.from(el.querySelectorAll('.grupo-titulo')).map(t => t.textContent!.replace(/\s+/g, ' ').trim());
      expect(titulos).toEqual(['Etapa 1 2', 'Sin etapa 1']);
      expect(el.textContent).toContain('Lotes guardados (3)');
      const chips = Array.from(el.querySelectorAll('.chips li'));
      expect(chips.map(c => c.className)).toEqual(['reservado', 'disponible', 'vendido']);
      expect(chips[0].textContent).toContain('1.100 m²');
      expect(chips[1].textContent).toContain('420,5 m²');
      expect(componente.estado(guardados[0] as Lote)).toBe('reservado');
      expect(componente.areaDe(guardados[1] as Lote)).toBe('420,5 m²');
    });

    it('eliminar un lote pide confirmación, lo borra en el servidor y recalcula el número sugerido', async () => {
      const { el, asistente, componente, refrescar } = crear({ lotes: guardados });
      const dialogo = TestBed.inject(ConfirmDialogService);
      expect(componente.desde()).toBe(3);

      (el.querySelector('button[aria-label="Eliminar lote LT-02"]') as HTMLButtonElement).click();
      expect(dialogo.config().message).toContain('LT-02');
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      const peticion = http.expectOne(`${LOTES}/2`);
      expect(peticion.request.method).toBe('DELETE');
      peticion.flush(null);
      refrescar();

      expect(asistente.lotes().map(l => l.codigo)).toEqual(['LT-01', 'LT-03']);
      expect(componente.desde()).toBe(2);
    });

    it('si se cancela la confirmación no se borra nada', async () => {
      const { el, asistente } = crear({ lotes: guardados });
      const dialogo = TestBed.inject(ConfirmDialogService);

      (el.querySelector('button[aria-label="Eliminar lote LT-01"]') as HTMLButtonElement).click();
      dialogo.cancel();
      await new Promise(r => setTimeout(r, 0));

      http.expectNone(`${LOTES}/1`);
      expect(asistente.lotes().length).toBe(3);
    });

    it('si el servidor falla al eliminar, el lote se queda y se avisa', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { el, asistente } = crear({ lotes: guardados });
      const dialogo = TestBed.inject(ConfirmDialogService);

      (el.querySelector('button[aria-label="Eliminar lote LT-01"]') as HTMLButtonElement).click();
      dialogo.confirm();
      await new Promise(r => setTimeout(r, 0));
      http.expectOne(`${LOTES}/1`).flush(null, { status: 500, statusText: 'Error' });

      expect(asistente.lotes().length).toBe(3);
      expect(avisos()[0].message).toContain('No se pudo eliminar el lote');
      expect(consola).toHaveBeenCalled();
    });

    it('un lote sin id no se puede eliminar', async () => {
      const { componente } = crear();
      const dialogo = TestBed.inject(ConfirmDialogService);

      await componente.eliminar({ codigo: 'X', areaM2: 1 } as Lote);

      expect(dialogo.isOpen()).toBe(false);
    });
  });

  describe('navegación', () => {
    it('sin lotes el botón dice "Omitir por ahora" y con lotes "Continuar"; ambos avanzan', () => {
      const { boton, asistente, fixture } = crear();
      asistente.paso.set(4);
      fixture.detectChanges();

      expect(boton('Omitir por ahora')).toBeDefined();
      boton('Omitir por ahora').click();
      expect(asistente.paso()).toBe(5);
    });

    /** Genera 3 filas sin guardar (quedan pendientes en la tabla). */
    function conFilasPendientes() {
      const base = crear({ lotes: [{ id: 1, codigo: 'LT-01', etapaId: 1, areaM2: 100 }] });
      base.asistente.paso.set(4);
      base.generar('3', '800');
      expect(base.componente.filas().length).toBe(3);
      return base;
    }

    it('con filas sin guardar, "Continuar" pregunta antes de salir y, si se cancela, se queda en el paso con sus filas', async () => {
      const { boton, asistente, componente } = conFilasPendientes();
      const dialogo = TestBed.inject(ConfirmDialogService);

      boton('Continuar').click();
      expect(dialogo.isOpen()).toBe(true);
      expect(dialogo.config().title).toBe('Lotes sin guardar');
      expect(dialogo.config().message).toContain('3 lotes generados');
      expect(dialogo.config().cancelText).toBe('Volver a revisarlos');
      dialogo.cancel();
      await new Promise((r) => setTimeout(r, 0));

      expect(asistente.paso()).toBe(4);
      expect(componente.filas().length).toBe(3);
    });

    it('si se confirma salir sin guardar, avanza (y Atrás también pregunta)', async () => {
      const { boton, asistente } = conFilasPendientes();
      const dialogo = TestBed.inject(ConfirmDialogService);

      boton('Atrás').click();
      expect(dialogo.isOpen()).toBe(true);
      dialogo.confirm();
      await new Promise((r) => setTimeout(r, 0));
      expect(asistente.paso()).toBe(3);

      asistente.paso.set(4);
      boton('Continuar').click();
      dialogo.confirm();
      await new Promise((r) => setTimeout(r, 0));
      expect(asistente.paso()).toBe(5);
    });

    it('con una sola fila pendiente el aviso habla en singular, y sin filas pendientes no pregunta nada', async () => {
      const { boton, asistente, generar, componente } = crear({ lotes: [{ id: 1, codigo: 'LT-01', etapaId: 1, areaM2: 100 }] });
      const dialogo = TestBed.inject(ConfirmDialogService);
      asistente.paso.set(4);

      boton('Continuar').click();
      await new Promise((r) => setTimeout(r, 0));
      expect(dialogo.isOpen()).toBe(false);
      expect(asistente.paso()).toBe(5);

      asistente.paso.set(4);
      generar('1', '800');
      expect(componente.filas().length).toBe(1);
      boton('Continuar').click();
      expect(dialogo.config().message).toContain('1 lote generado');
      dialogo.cancel();
      await new Promise((r) => setTimeout(r, 0));
    });

    it('con lotes guardados muestra "Continuar" y Atrás retrocede', () => {
      const { boton, asistente } = crear({ lotes: [{ id: 1, codigo: 'LT-01', etapaId: 1, areaM2: 100 }] });
      asistente.paso.set(4);

      expect(boton('Omitir por ahora')).toBeUndefined();
      boton('Atrás').click();
      expect(asistente.paso()).toBe(3);
      boton('Continuar').click();
      expect(asistente.paso()).toBe(4);
    });
  });
});
