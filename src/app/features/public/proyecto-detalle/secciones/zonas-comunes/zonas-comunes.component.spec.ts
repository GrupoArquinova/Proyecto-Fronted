import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ProyectoDetalleService } from '../../../../../core/services/proyecto-detalle.service';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { ProyectoDetalle } from '../../../../../core/models/proyecto-detalle.models';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { provideI18nPruebas } from '../../../../../i18n/pruebas';
import { ZonasComunesPublicoComponent } from './zonas-comunes.component';

@Component({ selector: 'app-prueba-vacio', standalone: true, template: '' })
class Vacio {}

const zona = (id: number, nombre: string, urls: string[] = [], extra: object = {}) => ({
  id, proyectoId: 7, nombre, descripcion: `Descripción de ${nombre}`, publicado: true, activo: true,
  imagenes: urls.map((imagenUrl, i) => ({ id: id * 10 + i, zonaComunId: id, imagenUrl })), ...extra
}) as never;

const fondo = { tipo: 'ZONAS_DESTACADAS', url: 'https://x.com/fondo.jpg', portada: false, publicado: true, activo: true } as never;

const punto = (id: number, zonaComunId: number | null, extra: Partial<Punto360> = {}): Punto360 =>
  ({ id, proyectoId: 7, escena: 'ZONAS', etiqueta: `Zona ${id}`, zonaComunId, posX: 10 * id, posY: 20 * id, ...extra });

const detalle = (extra: Partial<ProyectoDetalle> = {}): ProyectoDetalle => ({
  proyecto: { id: 7, empresaId: 1, nombre: 'La Hacienda', imagenUrl: 'https://x.com/proyecto.jpg' },
  ubicacion: null,
  zonasComunes: [], casasModelo: [], lotes: [], multimedia: [], multimediaCasas: [], multimediaZonas: [], contenido: [], puntos: [],
  ...extra
});

async function abrir(datos: ProyectoDetalle | null, consulta = '', panoramas: Record<number, unknown[]> = {}) {
  const multimedia = { listarPublicadosPorEntidad: vi.fn((tipo: string, id: number) => of(tipo === 'zonaComun' ? (panoramas[id] ?? []) : [])) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'proyectos/:id/zonas-comunes', component: ZonasComunesPublicoComponent }, { path: '**', component: Vacio }]),
      provideI18nPruebas(), provideHttpClient(), provideHttpClientTesting(), ProyectoDetalleService,
      { provide: MultimediaService, useValue: multimedia }
    ]
  });
  TestBed.inject(ProyectoDetalleService).detalle.set(datos);
  const harness = await RouterTestingHarness.create();
  const instancia = await harness.navigateByUrl(`/proyectos/7/zonas-comunes${consulta}`, ZonasComunesPublicoComponent);
  harness.detectChanges();
  return { harness, instancia, multimedia, el: harness.routeNativeElement as HTMLElement };
}

describe('ZonasComunesPublicoComponent', () => {
  describe('portada', () => {
    const conZonas = () => detalle({ zonasComunes: [zona(1, 'Piscina', ['p1.jpg', 'p2.jpg']), zona(2, 'Salón', []), zona(3, 'Parque', ['pq.jpg'])] });

    it('lista numerada de zonas con la primera elegida y su descripción', async () => {
      const { el } = await abrir(conZonas());
      const botones = Array.from(el.querySelectorAll<HTMLButtonElement>('.portada-lista button'));
      expect(botones.map(b => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['1Piscina', '2Salón', '3Parque']);
      expect(botones[0].classList.contains('activa')).toBe(true);
      expect(el.querySelector('.portada-texto h2')?.textContent).toBe('Amenidades');
      expect(el.querySelector('.portada-texto h3')?.textContent).toBe('Piscina');
      expect(el.querySelector('.portada-texto p')?.textContent).toBe('Descripción de Piscina');
      expect(el.querySelector('.visor-zona')).toBeNull();
    });

    it('cada zona aporta su foto de fondo y solo la elegida es visible', async () => {
      const { el } = await abrir(conZonas());
      const fondos = Array.from(el.querySelectorAll<HTMLImageElement>('.fondo-zona'));
      expect(fondos.map(f => f.getAttribute('src'))).toEqual(['p1.jpg', 'https://x.com/proyecto.jpg', 'pq.jpg']);
      expect(fondos.map(f => f.classList.contains('visible'))).toEqual([true, false, false]);
    });

    it('elegir una zona con imágenes abre su carrusel y marca la zona', async () => {
      const { el, harness, instancia } = await abrir(conZonas());
      el.querySelectorAll<HTMLButtonElement>('.portada-lista button')[2].click();
      harness.detectChanges();

      expect(instancia.seleccionada()).toBe(2);
      expect(instancia.zonaAbierta()).toBe(3);
      expect(el.querySelector('.portada-texto h3')?.textContent).toBe('Parque');
      expect(el.querySelector('.visor-zona-titulo')?.textContent).toBe('Parque');
      expect(el.querySelector<HTMLImageElement>('.visor-zona app-carrusel-laminas img')?.getAttribute('src')).toBe('pq.jpg');
      expect(el.querySelectorAll('.fondo-zona')[2].classList.contains('visible')).toBe(true);
    });

    it('elegir una zona sin imágenes no abre carrusel', async () => {
      const { el, harness, instancia } = await abrir(conZonas());
      el.querySelectorAll<HTMLButtonElement>('.portada-lista button')[2].click();
      harness.detectChanges();
      el.querySelectorAll<HTMLButtonElement>('.portada-lista button')[1].click();
      harness.detectChanges();

      expect(instancia.zonaAbierta()).toBeNull();
      expect(el.querySelector('.visor-zona')).toBeNull();
    });

    it('el carrusel se cierra con la X y al tocar el fondo, pero no al tocar el marco', async () => {
      const { el, harness, instancia } = await abrir(conZonas());
      instancia.elegirZona(0);
      harness.detectChanges();
      expect(el.querySelector('.visor-zona')).not.toBeNull();

      el.querySelector<HTMLElement>('.marco')!.click();
      harness.detectChanges();
      expect(el.querySelector('.visor-zona')).not.toBeNull();

      el.querySelector<HTMLButtonElement>('.visor-zona-cerrar')!.click();
      harness.detectChanges();
      expect(el.querySelector('.visor-zona')).toBeNull();

      instancia.elegirZona(0);
      harness.detectChanges();
      el.querySelector<HTMLElement>('.visor-zona')!.click();
      harness.detectChanges();
      expect(el.querySelector('.visor-zona')).toBeNull();
    });

    it('un índice fuera de rango no abre nada y la zona activa vuelve a la primera', async () => {
      const { instancia } = await abrir(conZonas());
      instancia.elegirZona(9);
      expect(instancia.zonaAbierta()).toBeNull();
      expect(instancia.zonaActiva()?.nombre).toBe('Piscina');
    });

    it('una zona sin descripción no muestra párrafo y sin id no abre carrusel', async () => {
      const { el, instancia } = await abrir(detalle({ zonasComunes: [zona(1, 'Piscina', [], { descripcion: '' }), zona(2, 'Sin id', ['x.jpg'], { id: undefined })] }));
      expect(el.querySelector('.portada-texto p')).toBeNull();
      instancia.elegirZona(1);
      expect(instancia.zonaAbierta()).toBeNull();
    });

    it('nombreZonaAbierta queda vacío si no hay zona abierta', async () => {
      const { instancia } = await abrir(conZonas());
      expect(instancia.nombreZonaAbierta()).toBe('');
      expect(instancia.laminasZonaAbierta()).toEqual([]);
    });
  });

  describe('zonas destacadas', () => {
    const conFondo = () => detalle({
      zonasComunes: [zona(1, 'Piscina', ['p.jpg']), zona(2, 'Jacuzzi')],
      multimedia: [fondo],
      puntos: [punto(1, 1), punto(2, 2), punto(3, null), { ...punto(4, 1), escena: 'URBANISMO' }]
    });

    it('dibuja el plano con un botón por punto de la escena ZONAS', async () => {
      const { el } = await abrir(conFondo(), '?vista=destacadas');
      expect(el.querySelector<HTMLImageElement>('app-plano-puntos img')?.getAttribute('src')).toBe('https://x.com/fondo.jpg');
      expect(Array.from(el.querySelectorAll('app-plano-puntos .pin')).map(b => b.getAttribute('aria-label'))).toEqual(['Zona 1', 'Zona 2', 'Zona 3']);
      expect(el.querySelector('app-tarjeta-punto')).toBeNull();
    });

    it('al pulsar un botón abre la tarjeta con la descripción de la zona y su 360 pedido a Multimedia', async () => {
      const { el, harness, multimedia, instancia } = await abrir(conFondo(), '?vista=destacadas', { 1: [{ id: 5, tipo: 'PANORAMICA_360', url: 'https://x.com/p360.jpg' }] });
      el.querySelector<HTMLButtonElement>('app-plano-puntos .pin')!.click();
      harness.detectChanges();

      expect(instancia.tarjeta()?.id).toBe(1);
      expect(instancia.zonaDeLaTarjeta()?.nombre).toBe('Piscina');
      expect(multimedia.listarPublicadosPorEntidad).toHaveBeenCalledWith('zonaComun', 1);
      expect(el.querySelector('app-tarjeta-punto .descripcion')?.textContent).toBe('Descripción de Piscina');
      expect(el.querySelector('app-tarjeta-punto app-visor-360')).not.toBeNull();
    });

    it('una zona sin 360 muestra su foto y el aviso; la X cierra la tarjeta', async () => {
      const { el, harness, instancia } = await abrir(conFondo(), '?vista=destacadas');
      el.querySelectorAll<HTMLButtonElement>('app-plano-puntos .pin')[1].click();
      harness.detectChanges();

      expect(el.querySelector('app-tarjeta-punto .vacio')?.textContent).toBe('Esta zona aún no tiene imagen 360°.');
      expect(el.querySelector('app-tarjeta-punto img.foto')?.getAttribute('src')).toBe('https://x.com/proyecto.jpg');

      el.querySelector<HTMLButtonElement>('app-tarjeta-punto .cerrar')!.click();
      harness.detectChanges();
      expect(instancia.tarjeta()).toBeNull();
      expect(el.querySelector('app-tarjeta-punto')).toBeNull();
    });

    it('un botón sin zona asociada abre la tarjeta sin descripción', async () => {
      const { el, harness, instancia } = await abrir(conFondo(), '?vista=destacadas');
      instancia.abrirPunto(punto(3, null));
      harness.detectChanges();
      expect(instancia.zonaDeLaTarjeta()).toBeNull();
      expect(el.querySelector('app-tarjeta-punto')).not.toBeNull();
    });
  });

  describe('galería', () => {
    const conGaleria = () => detalle({ zonasComunes: [zona(1, 'Piscina', ['p1.jpg', 'p2.jpg']), zona(2, 'Salón', ['s1.jpg']), zona(3, 'Sin fotos')] });

    it('con varias zonas con imágenes ofrece filtros y todas las imágenes con su leyenda', async () => {
      const { el, instancia } = await abrir(conGaleria(), '?vista=galeria');
      expect(Array.from(el.querySelectorAll('.filtros button')).map(b => b.textContent?.trim())).toEqual(['Todas', 'Piscina', 'Salón']);
      expect(instancia.laminas().map(l => l.url)).toEqual(['p1.jpg', 'p2.jpg', 's1.jpg']);
      expect(instancia.laminas()[0].titulo).toBe('Piscina');
      expect(el.querySelector('.leyenda')?.textContent).toBe('Piscina');
    });

    it('filtrar por zona deja solo sus imágenes y "Todas" las devuelve', async () => {
      const { el, harness, instancia } = await abrir(conGaleria(), '?vista=galeria');
      el.querySelectorAll<HTMLButtonElement>('.filtros button')[2].click();
      harness.detectChanges();
      expect(instancia.filtroZona()).toBe(2);
      expect(instancia.laminas().map(l => l.url)).toEqual(['s1.jpg']);
      expect(el.querySelectorAll('.filtros button')[2].classList.contains('activo')).toBe(true);
      expect(el.querySelector('app-carrusel-laminas img')?.getAttribute('src')).toBe('s1.jpg');

      el.querySelectorAll<HTMLButtonElement>('.filtros button')[0].click();
      harness.detectChanges();
      expect(instancia.filtroZona()).toBeNull();
      expect(instancia.laminas().length).toBe(3);
    });

    it('con una sola zona con imágenes no muestra filtros', async () => {
      const { el } = await abrir(detalle({ zonasComunes: [zona(1, 'Piscina', ['p1.jpg'])] }), '?vista=galeria');
      expect(el.querySelector('.filtros')).toBeNull();
      expect(el.querySelector('app-carrusel-laminas')).not.toBeNull();
    });

    it('si el título de la imagen no es el de la zona lo antepone "zona · título"', async () => {
      const { instancia } = await abrir(detalle({
        zonasComunes: [zona(1, 'Piscina')],
        multimediaZonas: [{ id: 1, zonaComunId: 1, tipo: 'IMAGEN', url: 'sub.jpg', titulo: 'Atardecer', portada: false, publicado: true, activo: true } as never]
      }), '?vista=galeria');
      expect(instancia.laminas()).toEqual([{ url: 'sub.jpg', titulo: 'Piscina · Atardecer' }]);
    });
  });

  it('sin detalle no pinta zonas', async () => {
    const { el } = await abrir(null);
    expect(el.querySelectorAll('.portada-lista li').length).toBe(0);
  });

  it('foto() delega en el servicio para elegir la imagen de la zona', async () => {
    const { instancia } = await abrir(detalle({ zonasComunes: [zona(1, 'Piscina', ['p.jpg'])] }));
    expect(instancia.foto(zona(1, 'Piscina', ['p.jpg']))).toBe('p.jpg');
    expect(instancia.foto(null)).toBe('https://x.com/proyecto.jpg');
  });
});
