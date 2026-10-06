import { Component, DestroyRef, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ProyectoDetalleService } from '../../../core/services/proyecto-detalle.service';

/**
 * Micrositio de un proyecto: menú lateral con las secciones que el administrador ya llenó
 * y, a la derecha, la sección activa (rutas hijas de /proyectos/:id).
 */
@Component({
  selector: 'app-proyecto-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  providers: [ProyectoDetalleService],
  templateUrl: './proyecto-detalle.component.html',
  styleUrl: './proyecto-detalle.component.scss'
})
export class ProyectoDetalleComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  readonly datos = inject(ProyectoDetalleService);

  private proyectoId = 0;

  /** Menú plegado (escritorio) o cajón abierto (móvil). */
  readonly menuColapsado = signal(false);
  readonly menuMovilAbierto = signal(false);

  private urlActual = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** /proyectos/:id/<seccion>?vista=<vista> */
  readonly seccionActiva = computed(() =>
    this.router.parseUrl(this.urlActual()).root.children['primary']?.segments[2]?.path ?? '');
  readonly vistaActiva = computed(() =>
    this.router.parseUrl(this.urlActual()).queryParams['vista'] as string | undefined);

  /** Texto de la barra superior: "Sección › Vista" (por ejemplo "Ubicación › Mapa"). */
  readonly seccionTitulo = computed(() =>
    this.datos.secciones().find(s => s.id === this.seccionActiva())?.titulo ?? '');
  readonly vistaTitulo = computed(() => {
    const subs = this.datos.secciones().find(s => s.id === this.seccionActiva())?.subsecciones ?? [];
    return subs.find(v => v.id === this.vistaDe(this.seccionActiva()))?.titulo ?? '';
  });

  /**
   * Vistas "inmersivas": ocupan toda la pantalla (portada y video de Bienvenida) y el menú
   * flota translúcido encima. El resto de secciones conserva el menú sólido y su página.
   */
  readonly inmersivo = computed(() => {
    if (this.seccionActiva() === 'respaldo') return true;
    if (this.seccionActiva() !== 'bienvenida') return false;
    const vista = this.vistaDe('bienvenida');
    // Beneficios solo es inmersiva si hay lámina; con solo texto usa el panel normal
    return vista !== 'beneficios' || !!this.datos.imagenBeneficios();
  });

  readonly pantallaCompleta = signal(false);
  readonly pantallaCompletaDisponible = signal(false);

  readonly proyecto = computed(() => this.datos.detalle()?.proyecto ?? null);
  readonly ubicacionTexto = computed(() => {
    const u = this.datos.detalle()?.ubicacion;
    return u ? [u.ciudad, u.departamento].filter(Boolean).join(', ') : '';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // iPhone no permite pantalla completa en páginas: en ese caso el botón no se muestra
      this.pantallaCompletaDisponible.set(!!this.document.documentElement.requestFullscreen);
      // Sube el botón de WhatsApp para que el de pantalla completa quede debajo (ver styles.scss)
      this.document.body.classList.add('micrositio');
      inject(DestroyRef).onDestroy(() => this.document.body.classList.remove('micrositio'));
    }

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.proyectoId = Number(params.get('id'));
      if (Number.isInteger(this.proyectoId) && this.proyectoId > 0) {
        this.datos.cargar(this.proyectoId);
      } else {
        this.datos.estado.set('no-encontrado');
      }
    });
  }

  /**
   * Vista activa de una sección: la pedida en la URL si existe o, si no, la primera.
   * Bienvenida es la excepción: sin vista elegida muestra la portada y ninguna vista queda marcada.
   */
  vistaDe(seccionId: string): string | null {
    if (seccionId !== this.seccionActiva()) return null;
    const subs = this.datos.secciones().find(s => s.id === seccionId)?.subsecciones ?? [];
    const pedida = this.vistaActiva();
    if (subs.some(v => v.id === pedida)) return pedida ?? null;
    return seccionId === 'bienvenida' ? null : (subs[0]?.id ?? null);
  }

  reintentar(): void {
    this.datos.cargar(this.proyectoId);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  /** Se pone toda la página (no solo este componente) para que el botón de WhatsApp siga visible. */
  alternarPantallaCompleta(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const accion = this.document.fullscreenElement
      ? this.document.exitFullscreen()
      : this.document.documentElement.requestFullscreen();
    accion.catch(() => undefined);
  }

  @HostListener('document:fullscreenchange')
  sincronizarPantallaCompleta(): void {
    this.pantallaCompleta.set(!!this.document.fullscreenElement);
  }
}
