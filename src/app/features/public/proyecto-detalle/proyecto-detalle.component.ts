import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    return subs.find(v => v.id === (this.vistaActiva() ?? subs[0]?.id))?.titulo ?? '';
  });

  readonly proyecto = computed(() => this.datos.detalle()?.proyecto ?? null);
  readonly ubicacionTexto = computed(() => {
    const u = this.datos.detalle()?.ubicacion;
    return u ? [u.ciudad, u.departamento].filter(Boolean).join(', ') : '';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.proyectoId = Number(params.get('id'));
      if (Number.isInteger(this.proyectoId) && this.proyectoId > 0) {
        this.datos.cargar(this.proyectoId);
      } else {
        this.datos.estado.set('no-encontrado');
      }
    });
  }

  reintentar(): void {
    this.datos.cargar(this.proyectoId);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }
}
