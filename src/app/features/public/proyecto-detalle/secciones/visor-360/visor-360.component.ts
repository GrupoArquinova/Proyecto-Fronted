import {
  Component, DestroyRef, ElementRef, ViewEncapsulation, afterNextRender, effect, inject, input, output, signal, viewChild
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
  template: `
    <div #contenedor class="visor-360" role="img" [attr.aria-label]="'Recorrido 360: ' + titulo()"></div>
    @if (pista360() && pista()) {
      <div class="pista-360" aria-hidden="true">
        <span class="etiqueta-360">360°</span>
        <svg viewBox="0 0 64 74" width="92" height="106"><path d="M6 14 L18 5 V11 H46 V5 L58 14 L46 23 V17 H18 V23 Z" fill="#fff" stroke="#1b2222" stroke-width="1.6" stroke-linejoin="round" /><g transform="translate(15 27) scale(1.85)"><path fill="#fff" stroke="#1b2222" stroke-width="0.9" stroke-linejoin="round" d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z" /></g></svg>
      </div>
    }
  `,
  styles: [`
    app-visor-360 { display: block; position: relative; }
    /* Aviso de que la imagen se puede girar: mano con flechas y "360°"; se quita al tocar la imagen */
    app-visor-360 .pista-360 {
      position: absolute; z-index: 5; left: 50%; top: 50%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
      pointer-events: none; filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
      animation: pista-360-mover 1.8s cubic-bezier(0.77, 0, 0.175, 1) infinite;
    }
    app-visor-360 .etiqueta-360 {
      padding: 0.1rem 0.8rem; background: rgba(18, 26, 26, 0.7); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 999px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 0.08em;
    }
    @keyframes pista-360-mover {
      0%, 100% { transform: translate(calc(-50% - 16px), -50%); }
      50% { transform: translate(calc(-50% + 16px), -50%); }
    }
    @media (prefers-reduced-motion: reduce) { app-visor-360 .pista-360 { animation: none; } }
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
  host: {
    '[class.completo]': 'completo()',
    // Cualquier toque, arrastre o giro de rueda sobre la imagen quita el aviso
    '(pointerdown)': 'pista.set(false)',
    '(touchstart)': 'pista.set(false)',
    '(wheel)': 'pista.set(false)'
  }
})
export class Visor360Component {
  readonly url = input.required<string>();
  readonly titulo = input<string>('');
  /** Ocupa todo el espacio del contenedor, sin bordes redondeados. */
  readonly completo = input(false);
  /** Muestra el aviso "360°" con la mano hasta que el cliente toca la imagen. */
  readonly pista360 = input(true);
  readonly pista = signal(true);
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
