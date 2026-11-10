import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Lote } from '../../../../../core/models/lote.models';
import { estadoDeLote, formatoArea, formatoPrecio } from '../../../../../core/utils/lotes';
import { IdiomaService } from '../../../../../core/services/idioma.service';
import { MultimediaService } from '../../../../../core/services/multimedia.service';
import { Visor360Component } from '../visor-360/visor-360.component';

/**
 * Ficha de un lote con su estado y el botón para pedir información (lleva el lote al formulario).
 * Si el lote tiene imagen 360°, muestra el botón "Ver en 360°" que la abre en una ventana a pantalla completa.
 */
@Component({
  selector: 'app-lote-tarjeta',
  standalone: true,
  imports: [TranslocoPipe, RouterLink, Visor360Component],
  template: `
    <article class="tarjeta">
      <span class="etiqueta">{{ 'proyecto.loteTarjeta.etiqueta' | transloco }}</span>
      <h3>{{ lote().codigo }}</h3>
      @if (lote().nombre) { <p class="nombre">{{ lote().nombre }}</p> }

      <dl>
        <div><dt>{{ 'proyecto.loteTarjeta.area' | transloco }}</dt><dd>{{ area() }}</dd></div>
        <div><dt>{{ 'proyecto.loteTarjeta.estado' | transloco }}</dt><dd><span class="estado" [class]="estado().clave">{{ estado().clave === 'otro' ? estado().etiqueta : ('estadoLote.' + estado().clave | transloco) }}</span></dd></div>
        @if (precio()) { <div><dt>{{ 'proyecto.loteTarjeta.precio' | transloco }}</dt><dd>{{ precio() }}</dd></div> }
        @if (lote().etapaNombre) { <div><dt>{{ 'proyecto.loteTarjeta.etapa' | transloco }}</dt><dd>{{ lote().etapaNombre }}</dd></div> }
      </dl>

      @if (lote().descripcion) { <p class="texto">{{ lote().descripcion }}</p> }
      @if (lote().caracteristicas) { <p class="texto">{{ lote().caracteristicas }}</p> }

      @if (panorama()) {
        <button type="button" class="boton-360" (click)="abrir360()" aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3.5 9h17M3.5 15h17" />
          </svg>
          {{ 'proyecto.loteTarjeta.ver360' | transloco }}
        </button>
      }

      @if (estado().clave !== 'vendido') {
        <a class="boton" [routerLink]="['/proyectos', proyectoId(), 'contacto']" [queryParams]="{ lote: lote().id }">
          {{ 'proyecto.loteTarjeta.solicitar' | transloco }}
        </a>
      }
    </article>

    @if (visorAbierto() && panorama(); as url) {
      <!-- <dialog> nativo: se abre en la capa superior del navegador (por encima del menú y de los botones flotantes),
           se cierra con Escape y atrapa el foco -->
      <!-- Tocar el fondo para cerrar es un atajo con mouse: con teclado se cierra con Escape o con el botón X -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <dialog #dialogo class="dialogo-360" [attr.aria-label]="'proyecto.tarjeta.tLote' | transloco: { nombre: lote().codigo }"
              (close)="cerrar360()" (click)="clicEnFondo($event)">
        <header>
          <strong>{{ lote().codigo }}</strong>
          <span>360°</span>
          <button type="button" class="cerrar-360" (click)="cerrar360()" [attr.aria-label]="'comun.cerrar' | transloco">&times;</button>
        </header>
        <app-visor-360 [url]="url" [titulo]="'proyecto.tarjeta.tLote' | transloco: { nombre: lote().codigo }" [completo]="true" />
      </dialog>
    }
  `,
  styles: [`
    :host { display: block; }
    .tarjeta {
      padding: 1.6rem 1.7rem;
      background: #ffffff;
      border: 1px solid rgba(42, 102, 101, 0.16);
      border-top: 5px solid #2a6665;
      border-radius: 18px;
      box-shadow: 0 14px 40px rgba(42, 102, 101, 0.18);
      color: #424242;
    }
    .etiqueta { color: #3c706e; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; }
    h3 { margin: 0.4rem 0 0.2rem; font-size: 2.3rem; font-weight: 800; color: #2a6665; line-height: 1.1; }
    .nombre { color: #6a6a6a; margin-bottom: 0.4rem; }
    dl { display: grid; gap: 0.2rem; margin: 1.1rem 0; }
    dl div { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid rgba(42, 102, 101, 0.1); }
    dt { color: #6a6a6a; font-size: 0.92rem; }
    dd { margin: 0; font-weight: 600; text-align: right; }
    .texto { color: #6a6a6a; line-height: 1.7; margin-bottom: 0.6rem; white-space: pre-line; }
    .estado { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; color: #ffffff; }
    .disponible { background: #2f9e63; }
    .reservado { background: #d9951a; }
    .vendido { background: #c94a4a; }
    .otro { background: #8a8a8a; }
    .boton {
      display: block; margin-top: 1.2rem; padding: 0.9rem; text-align: center;
      background: #2a6665; color: #ffffff; border-radius: 12px; font-weight: 700; text-decoration: none;
      box-shadow: 0 8px 20px rgba(42, 102, 101, 0.28); transition: background 0.2s, transform 0.2s;
    }
    .boton:hover { background: #3c706e; transform: translateY(-1px); }
    .boton-360 {
      display: flex; align-items: center; justify-content: center; gap: 0.55rem; width: 100%; margin-top: 1.2rem; padding: 0.8rem;
      background: #ffffff; color: #2a6665; border: 2px solid #2a6665; border-radius: 12px;
      font: inherit; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s, transform 0.2s;
    }
    .boton-360:active { transform: scale(0.98); }
    .boton-360 + .boton { margin-top: 0.7rem; }
    @media (hover: hover) and (pointer: fine) {
      .boton-360:hover { background: #2a6665; color: #ffffff; }
    }

    /* Ventana del recorrido 360° */
    .dialogo-360 {
      width: min(1100px, 96vw); height: min(78vh, 720px); max-width: none; max-height: none; margin: auto; padding: 0; overflow: hidden;
      background: #0b1413; color: #ffffff; border: none; border-radius: 18px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
    }
    .dialogo-360[open] { animation: dialogo-360-entrar 0.2s cubic-bezier(0.23, 1, 0.32, 1); }
    .dialogo-360::backdrop { background: rgba(8, 16, 15, 0.82); }
    .dialogo-360 header {
      position: absolute; z-index: 10; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 0.6rem;
      padding: 0.8rem 1rem; pointer-events: none;
      background: linear-gradient(180deg, rgba(8, 16, 15, 0.75), transparent);
    }
    .dialogo-360 header strong { font-size: 1.1rem; }
    .dialogo-360 header span { padding: 0.05rem 0.6rem; border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 999px; font-size: 0.8rem; font-weight: 700; }
    .cerrar-360 {
      margin-left: auto; width: 36px; height: 36px; display: grid; place-items: center; padding: 0 0 3px; pointer-events: auto;
      background: rgba(255, 255, 255, 0.18); color: #ffffff; border: none; border-radius: 50%; font-size: 1.6rem; line-height: 1; cursor: pointer;
    }
    .cerrar-360:active { transform: scale(0.92); }
    @media (hover: hover) and (pointer: fine) { .cerrar-360:hover { background: rgba(255, 255, 255, 0.32); } }
    @keyframes dialogo-360-entrar { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .dialogo-360[open] { animation: none; } }
    @media (max-width: 700px) { .dialogo-360 { width: 100vw; height: 100dvh; border-radius: 0; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoteTarjetaComponent {
  private idioma = inject(IdiomaService);
  private multimedia = inject(MultimediaService);
  readonly lote = input.required<Lote>();
  readonly proyectoId = input.required<number>();

  /** undefined = consultando · null = el lote no tiene imagen 360° · texto = su URL. El botón solo sale si hay imagen. */
  readonly panorama = toSignal(
    toObservable(this.lote).pipe(
      switchMap(lote => lote.id == null ? of(null) : this.multimedia.listarPublicadosPorEntidad('lote', lote.id).pipe(
        map(recursos => recursos.find(r => r.tipo === 'PANORAMICA_360')?.url ?? null),
        catchError(() => of(null)),
        startWith(undefined)
      ))
    ),
    { initialValue: undefined as string | null | undefined }
  );

  readonly visorAbierto = signal(false);
  private dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    // Al elegir otro lote, la ventana del anterior se cierra
    effect(() => {
      this.lote();
      this.visorAbierto.set(false);
    });
    // Al aparecer el <dialog> se abre como modal (capa superior del navegador)
    effect(() => {
      const el = this.dialogo()?.nativeElement;
      if (el && !el.open) {
        if (typeof el.showModal === 'function') el.showModal();
        else el.setAttribute('open', '');
      }
    });
  }

  abrir360(): void {
    this.visorAbierto.set(true);
  }

  cerrar360(): void {
    this.visorAbierto.set(false);
  }

  /** Tocar el fondo oscuro (el propio <dialog>, no su contenido) cierra la ventana. */
  clicEnFondo(evento: Event): void {
    if (evento.target === evento.currentTarget) this.cerrar360();
  }

  readonly estado = computed(() => estadoDeLote(this.lote()));
  readonly area = computed(() => formatoArea(this.lote().areaM2, this.idioma.idioma()));
  readonly precio = computed(() => formatoPrecio(this.lote().precio));
}
