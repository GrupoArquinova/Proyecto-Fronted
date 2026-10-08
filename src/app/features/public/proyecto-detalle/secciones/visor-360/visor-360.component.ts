import {
  Component, DestroyRef, ElementRef, ViewEncapsulation, afterNextRender, effect, inject, input, output, viewChild
} from '@angular/core';
import { Punto360 } from '../../../../../core/models/punto-360.models';
import { htmlDePin } from '../../../../../core/utils/puntos';

/** Posición dentro de la imagen 360°, en radianes. */
export interface PosicionPanorama {
  yaw: number;
  pitch: number;
}

// Lo mínimo que se usa del visor y su plugin de marcadores (se cargan bajo demanda, solo en el navegador)
interface VisorPsv {
  destroy: () => void;
  animate: (opciones: { yaw: number; pitch: number; speed: string | number }) => unknown;
  addEventListener: (tipo: string, fn: (e: { data: { yaw: number; pitch: number; rightclick?: boolean } }) => void) => void;
  getPlugin: (plugin: unknown) => PluginMarcadores;
}

interface PluginMarcadores {
  setMarkers: (marcadores: unknown[]) => void;
  addEventListener: (tipo: 'select-marker', fn: (e: { marker: { data?: { puntoId?: number } } }) => void) => void;
}

/**
 * Visor de panorámicas 360° (imagen equirectangular) con Photo Sphere Viewer.
 * Muestra los botones de los lotes sobre la imagen y avisa cuál se eligió; con `completo` ocupa todo
 * el espacio disponible. Solo corre en el navegador y se carga bajo demanda para no engordar el bundle.
 */
@Component({
  selector: 'app-visor-360',
  standalone: true,
  // Los botones se crean como HTML dentro del visor: sus estilos deben ser globales a este componente
  encapsulation: ViewEncapsulation.None,
  template: `<div #contenedor class="visor-360" role="img" [attr.aria-label]="'Recorrido 360: ' + titulo()"></div>`,
  styles: [`
    app-visor-360 { display: block; }
    app-visor-360.completo { position: absolute; inset: 0; }
    app-visor-360 .visor-360 { width: 100%; height: min(70vh, 640px); border-radius: 16px; overflow: hidden; background: rgba(42, 102, 101, 0.03); box-shadow: 0 6px 24px rgba(42, 102, 101, 0.1); }
    app-visor-360.completo .visor-360 { height: 100%; border-radius: 0; box-shadow: none; background: #0b1413; }

    /* Botón de un lote sobre la imagen: etiqueta oscura translúcida con su área */
    .psv-container .pin-360 {
      display: flex; flex-direction: column; align-items: center; gap: 0.05rem;
      padding: 0.3rem 0.8rem; min-width: 56px;
      background: rgba(18, 26, 26, 0.84); color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.55); border-radius: 14px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.15; text-align: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4); cursor: pointer; transition: transform 0.15s, background 0.15s;
    }
    .psv-container .pin-360 strong { font-size: 0.95rem; font-weight: 700; }
    .psv-container .pin-360 small { font-size: 0.7rem; opacity: 0.85; }
    /* Lugar cercano: rótulo con un palo hacia el suelo; no se pulsa */
    .psv-container .pin-lugar { display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .psv-container .pin-lugar span {
      padding: 0.25rem 0.8rem; background: rgba(18, 26, 26, 0.88); color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; white-space: nowrap;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.9rem; font-weight: 600;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .psv-container .pin-lugar::after { content: ''; width: 2px; height: 34px; background: rgba(18, 26, 26, 0.88); }
    .psv-container .psv-marker:hover .pin-360 { background: #2a6665; transform: scale(1.08); }
    .psv-container .pin-360-pendiente { width: 18px; height: 18px; border-radius: 50%; background: #ffd23f; border: 3px solid #ffffff; box-shadow: 0 0 0 4px rgba(255, 210, 63, 0.45); }
  `],
  host: { '[class.completo]': 'completo()' }
})
export class Visor360Component {
  readonly url = input.required<string>();
  readonly titulo = input<string>('');
  /** Ocupa todo el espacio del contenedor, sin bordes redondeados. */
  readonly completo = input(false);
  /** Botones sobre la imagen (ya filtrados para esta imagen). */
  readonly puntos = input<Punto360[]>([]);
  /** Marca amarilla temporal (editor del administrador): el lugar donde se va a colocar un botón nuevo. */
  readonly pendiente = input<PosicionPanorama | null>(null);

  readonly puntoElegido = output<Punto360>();
  /** Clic en un lugar libre de la imagen (lo usa el editor para colocar botones). */
  readonly clicEnImagen = output<PosicionPanorama>();

  private contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');
  private destroyRef = inject(DestroyRef);
  private visor: VisorPsv | null = null;
  private marcadores: PluginMarcadores | null = null;

  constructor() {
    afterNextRender(() => {
      let destruido = false;

      this.destroyRef.onDestroy(() => {
        destruido = true;
        this.visor?.destroy();
        this.visor = null;
      });

      Promise.all([import('@photo-sphere-viewer/core'), import('@photo-sphere-viewer/markers-plugin')])
        .then(([{ Viewer }, { MarkersPlugin }]) => {
          if (destruido) return;
          const visor = new Viewer({
            container: this.contenedor().nativeElement,
            panorama: this.url(),
            navbar: ['zoom', 'move', 'fullscreen'],
            loadingTxt: 'Cargando recorrido...',
            plugins: [[MarkersPlugin, {}]]
          }) as unknown as VisorPsv;

          const marcadores = visor.getPlugin(MarkersPlugin);
          marcadores.addEventListener('select-marker', e => {
            const punto = this.puntos().find(p => p.id === e.marker.data?.puntoId);
            if (punto) this.puntoElegido.emit(punto);
          });
          visor.addEventListener('click', e => {
            if (!e.data.rightclick) this.clicEnImagen.emit({ yaw: e.data.yaw, pitch: e.data.pitch });
          });

          this.visor = visor;
          this.marcadores = marcadores;
          this.sincronizarMarcadores();
        })
        .catch(err => console.error('No se pudo iniciar el visor 360:', err));
    });

    // Cuando cambian los botones (o la marca temporal) se vuelven a dibujar sobre la imagen
    effect(() => {
      this.puntos();
      this.pendiente();
      this.sincronizarMarcadores();
    });
  }

  /** Gira la vista hasta una posición (el editor lo usa para mostrar un botón existente). */
  irA(posicion: PosicionPanorama): void {
    this.visor?.animate({ yaw: posicion.yaw, pitch: posicion.pitch, speed: '12rpm' });
  }

  private sincronizarMarcadores(): void {
    if (!this.marcadores) return;

    const lista: unknown[] = this.puntos()
      .filter(p => p.yaw != null && p.pitch != null)
      .map(p => ({
        id: `punto-${p.id}`,
        position: { yaw: Number(p.yaw), pitch: Number(p.pitch) },
        html: htmlDePin(p),
        anchor: 'bottom center',
        data: { puntoId: p.id }
      }));

    const pendiente = this.pendiente();
    if (pendiente) {
      lista.push({
        id: 'pendiente',
        position: { yaw: pendiente.yaw, pitch: pendiente.pitch },
        html: '<div class="pin-360-pendiente"></div>',
        anchor: 'center center'
      });
    }

    this.marcadores.setMarkers(lista);
  }
}
