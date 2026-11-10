import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ProyectoDetalleService } from '../../../core/services/proyecto-detalle.service';
import { SECCIONES_CON_PORTADA } from '../../../core/models/proyecto-detalle.models';
import { BotonPantallaCompletaComponent } from '../../../shared/components/boton-pantalla-completa/boton-pantalla-completa.component';
import { AnaliticaService } from '../../../core/services/analitica.service';
import { SeoService, recortarDescripcion } from '../../../core/services/seo.service';
import { proyectoJsonLd } from '../../../core/utils/seo-jsonld';
import { AccionesProyectoComponent } from '../../../shared/components/acciones-proyecto/acciones-proyecto.component';
import { IdiomaService } from '../../../core/services/idioma.service';
import { SelectorIdiomaComponent } from '../../../shared/components/selector-idioma/selector-idioma.component';
import { ImagenOptimizadaPipe } from '../../../shared/pipes/imagen-optimizada.pipe';

/**
 * Micrositio de un proyecto: menú lateral con las secciones que el administrador ya llenó
 * y, a la derecha, la sección activa (rutas hijas de /proyectos/:id).
 */
@Component({
  selector: 'app-proyecto-detalle',
  standalone: true,
  imports: [
    ImagenOptimizadaPipe,
    RouterLink,
    RouterOutlet,
    TranslocoPipe,
    SelectorIdiomaComponent,
    BotonPantallaCompletaComponent,
    AccionesProyectoComponent,
  ],
  providers: [ProyectoDetalleService],
  templateUrl: './proyecto-detalle.component.html',
  styleUrl: './proyecto-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProyectoDetalleComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly datos = inject(ProyectoDetalleService);
  private seo = inject(SeoService);
  private idioma = inject(IdiomaService);
  private analitica = inject(AnaliticaService);

  /** Título, descripción y datos para buscadores de la página del proyecto y de su sección activa. */
  private readonly seoDelProyecto = effect(() => {
    const estado = this.datos.estado();
    if (estado === 'no-encontrado' || estado === 'error') {
      this.seo.establecer({
        titulo: this.idioma.t('proyecto.armazon.noEncontradoSeo'),
        noindex: true,
      });
      return;
    }

    const detalle = this.datos.detalleLocal();
    if (!detalle) return;

    const p = detalle.proyecto;
    const u = detalle.ubicacion;
    const ingles = this.idioma.idioma() === 'en';
    const lugar = [u?.ciudad, u?.departamento].filter(Boolean).join(', ');
    const seccion = this.seccionTitulo();
    const idSeccion = this.seccionActiva() || 'bienvenida';
    const conSeccion = !!seccion && idSeccion !== 'bienvenida';
    const prefijo = conSeccion ? `${seccion} · ` : '';
    const imagen = p.imagenUrl ?? detalle.multimedia.find((m) => m.tipo === 'IMAGEN')?.url ?? null;
    const enLugar = lugar ? ` ${this.idioma.t('proyecto.armazon.enLugar', { lugar })}` : '';
    const tipo = p.tipoProyecto ? this.idioma.t(`tipoProyecto.${p.tipoProyecto}`).toLocaleLowerCase(ingles ? 'en' : 'es') : '';
    const etapa = p.estadoProyecto ? this.idioma.t(`etapaProyecto.${p.estadoProyecto}`).toLocaleLowerCase(ingles ? 'en' : 'es') : '';

    // Descripción propia del proyecto (en inglés si está traducida); si no hay, una con su nombre, tipo, lugar y etapa
    const propia = (ingles ? p.descripcionEn || p.descripcion : p.descripcion) ?? '';
    const generica = tipo && etapa
      ? this.idioma.t('seo.descripcionProyectoTipo', { nombre: p.nombre, lugar: enLugar, tipo, etapa })
      : this.idioma.t('proyecto.armazon.descripcionSeo', { nombre: p.nombre, lugar: enLugar });
    const base = propia.trim() || generica;
    // Cada sección lleva su propia descripción (no repite la de las demás páginas del mismo proyecto)
    const descripcion = conSeccion
      ? this.idioma.t('seo.descripcionSeccion', { seccion, nombre: p.nombre, lugar: enLugar, descripcion: base })
      : base;
    const ruta = `/proyectos/${p.id}/${idSeccion}`;
    const raiz = this.seo.urlAbsoluta('/');
    const nombreProyecto = `${p.nombre}${enLugar}`;

    this.seo.establecer({
      titulo: `${prefijo}${nombreProyecto}`,
      descripcion,
      imagen,
      imagenAlt: this.idioma.t('seo.altPortada', { nombre: p.nombre }),
      ruta,
      jsonLd: proyectoJsonLd({
        base: raiz ? raiz.replace(/\/+$/, '') : null,
        ruta,
        idioma: ingles ? 'en' : 'es',
        nombre: p.nombre,
        descripcion: recortarDescripcion(base, 300),
        imagen,
        tipoProyecto: p.tipoProyecto,
        ofertaComercial: p.tipoRegistro !== 'PORTAFOLIO',
        ciudad: u?.ciudad,
        departamento: u?.departamento,
        latitud: u?.latitud,
        longitud: u?.longitud,
        migas: [
          { nombre: this.idioma.t('proyecto.armazon.migaInicio'), ruta: '/' },
          { nombre: this.idioma.t('seo.proyectosTitulo'), ruta: '/proyectos' },
          { nombre: p.nombre, ruta: conSeccion ? `/proyectos/${p.id}/bienvenida` : undefined },
          ...(conSeccion ? [{ nombre: seccion }] : []),
        ],
      }),
    });
  });

  /** Se cuenta una sola vez por apertura del proyecto (cambiar de sección o de idioma no suma otra visita). */
  private vistaContada: number | null = null;
  private readonly contarVista = effect(() => {
    const id = this.datos.estado() === 'listo' ? (this.datos.detalleLocal()?.proyecto.id ?? null) : null;
    if (id != null && id !== this.vistaContada) {
      this.vistaContada = id;
      untracked(() => this.analitica.vistaProyecto(id));
    }
  });

  private proyectoId = 0;

  /** Menú plegado (escritorio) o cajón abierto (móvil). */
  readonly menuColapsado = signal(false);
  readonly menuMovilAbierto = signal(false);

  private urlActual = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** /proyectos/:id/<seccion>?vista=<vista> */
  readonly seccionActiva = computed(
    () => this.router.parseUrl(this.urlActual()).root.children['primary']?.segments[2]?.path ?? '',
  );
  readonly vistaActiva = computed(
    () => this.router.parseUrl(this.urlActual()).queryParams['vista'] as string | undefined,
  );

  /** Texto de la barra superior: "Sección › Vista" (por ejemplo "Ubicación › Mapa"). */
  readonly seccionTitulo = computed(
    () => this.datos.secciones().find((s) => s.id === this.seccionActiva())?.titulo ?? '',
  );
  readonly vistaTitulo = computed(() => {
    const subs =
      this.datos.secciones().find((s) => s.id === this.seccionActiva())?.subsecciones ?? [];
    return subs.find((v) => v.id === this.vistaDe(this.seccionActiva()))?.titulo ?? '';
  });

  /**
   * Vistas "inmersivas": ocupan toda la pantalla (portada y video de Bienvenida) y el menú
   * flota translúcido encima. El resto de secciones conserva el menú sólido y su página.
   */
  readonly inmersivo = computed(() => {
    if (this.seccionActiva() === 'respaldo') return true;
    if (this.datos.esInmersiva(this.seccionActiva(), this.vistaDe(this.seccionActiva())))
      return true;
    if (this.seccionActiva() !== 'bienvenida') return false;
    const vista = this.vistaDe('bienvenida');
    // Beneficios solo es inmersiva si hay lámina; con solo texto usa el panel normal
    return vista !== 'beneficios' || !!this.datos.imagenBeneficios();
  });

  readonly proyecto = computed(() => this.datos.detalleLocal()?.proyecto ?? null);
  readonly ubicacionTexto = computed(() => {
    const u = this.datos.detalleLocal()?.ubicacion;
    return u ? [u.ciudad, u.departamento].filter(Boolean).join(', ') : '';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
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
   * Bienvenida y Zonas comunes son la excepción: sin vista elegida muestran su portada y ninguna vista queda marcada.
   */
  vistaDe(seccionId: string): string | null {
    if (seccionId !== this.seccionActiva()) return null;
    const subs = this.datos.secciones().find((s) => s.id === seccionId)?.subsecciones ?? [];
    const pedida = this.vistaActiva();
    if (subs.some((v) => v.id === pedida)) return pedida ?? null;
    return SECCIONES_CON_PORTADA.includes(seccionId) ? null : (subs[0]?.id ?? null);
  }

  reintentar(): void {
    this.datos.cargar(this.proyectoId);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }
}
