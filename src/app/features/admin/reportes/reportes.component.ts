import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Proyecto, ETAPAS_PROYECTO } from '../../../core/models/proyecto.models';
import { EstadoSolicitud } from '../../../core/models/solicitud.models';
import { DashboardResponse, FiltroReporte, ReporteId } from '../../../core/models/reporte.models';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { ReporteService } from '../../../core/services/reporte.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { ToastService } from '../../../core/services/toast.service';
import { FiltroUsado, Pestana, PESTANAS, definicionDe, legible } from './reportes.definiciones';

/** Estados de lote: los ids coinciden con los que crea la base de datos (estados_lote). */
const ESTADOS_LOTE = [
  { id: 1, nombre: 'Disponible' },
  { id: 2, nombre: 'Reservado' },
  { id: 3, nombre: 'Vendido' }
];

/** Cuántas filas se dibujan en pantalla; el Excel y el PDF siempre traen todas. */
const FILAS_EN_PANTALLA = 100;

// Sin OnPush a propósito: esta pantalla está dentro del panel, cuyas vistas se actualizan al recibir datos del servidor y no
// todas usan signals; con OnPush quedarían congeladas en "Cargando...".
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private reporteService = inject(ReporteService);
  private proyectoService = inject(ProyectoService);
  private solicitudService = inject(SolicitudService);
  private toastService = inject(ToastService);

  readonly pestanas = PESTANAS;
  readonly estadosLote = ESTADOS_LOTE;
  readonly etapasProyecto = ETAPAS_PROYECTO;

  stats: DashboardResponse = {
    totalProyectos: 0,
    proyectosPublicados: 0,
    totalLotes: 0,
    lotesDisponibles: 0,
    lotesReservados: 0,
    lotesVendidos: 0,
    totalSolicitudes: 0,
    solicitudesNuevas: 0,
    distribucionLotesPorEstado: {},
    distribucionSolicitudesPorEstado: {},
  };

  /** Indica que se está generando un archivo (se muestra sobre toda la pantalla). */
  cargando = false;

  listaProyectos: Proyecto[] = [];
  estadosSolicitud: EstadoSolicitud[] = [];
  /** Proyecto de la ficha técnica en PDF. */
  proyectoIdPdf: number | null = null;

  // --- Reporte en pantalla ---
  readonly pestana = signal<Pestana>('lotes');
  readonly filas = signal<unknown[]>([]);
  readonly cargandoTabla = signal(false);
  readonly errorTabla = signal(false);
  private consulta = 0;

  // --- Filtros ---
  readonly proyectoId = signal<number | null>(null);
  readonly estadoLoteId = signal<number | null>(null);
  readonly estadoSolicitudId = signal<number | null>(null);
  readonly estadoProyecto = signal<string | null>(null);
  readonly fechaInicio = signal('');
  readonly fechaFin = signal('');
  readonly incluirInactivos = signal(false);

  readonly definicion = computed(() => definicionDe(this.pestana()));
  readonly filasVisibles = computed(() => this.filas().slice(0, FILAS_EN_PANTALLA));
  readonly hayMas = computed(() => this.filas().length > FILAS_EN_PANTALLA);
  readonly rangoInvalido = computed(() => !!this.fechaInicio() && !!this.fechaFin() && this.fechaInicio() > this.fechaFin());

  /** Los filtros que aplican al reporte que se está viendo; los demás no se envían. */
  readonly filtro = computed<FiltroReporte>(() => {
    const usa = new Set(this.definicion().filtros);
    return {
      proyectoId: usa.has('proyecto') ? this.proyectoId() : null,
      estadoLoteId: usa.has('estadoLote') ? this.estadoLoteId() : null,
      estadoSolicitudId: usa.has('estadoSolicitud') ? this.estadoSolicitudId() : null,
      estadoProyecto: usa.has('estadoProyecto') ? this.estadoProyecto() : null,
      fechaInicio: usa.has('fechas') ? this.fechaInicio() : null,
      fechaFin: usa.has('fechas') ? this.fechaFin() : null,
      incluirInactivos: usa.has('inactivos') ? this.incluirInactivos() : false,
    };
  });

  ngOnInit(): void {
    this.cargarDashboard();
    this.cargarProyectos();
    this.cargarEstadosSolicitud();
    this.consultar();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.reporteService.getDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.stats = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar el dashboard:', err);
        this.cargando = false;
        this.toastService.showError('Error al cargar los indicadores del sistema.');
      },
    });
  }

  cargarProyectos(): void {
    this.proyectoService.getProyectos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (proyectos) => {
        this.listaProyectos = proyectos;
        const primero = proyectos.find((p) => p.activo !== false) ?? proyectos[0];
        this.proyectoIdPdf = primero?.id ?? null;
      },
      error: (err) => {
        console.error('Error al cargar la lista de proyectos:', err);
        this.toastService.showError('Error al cargar proyectos');
      },
    });
  }

  private cargarEstadosSolicitud(): void {
    this.solicitudService.obtenerEstados().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (estados) => (this.estadosSolicitud = estados),
      error: () => (this.estadosSolicitud = []),
    });
  }

  // --- Reporte en pantalla ---

  elegirPestana(id: Pestana): void {
    if (id === this.pestana()) return;
    this.pestana.set(id);
    this.consultar();
  }

  /** Vuelve a pedir el reporte con los filtros actuales. Si llegan respuestas desordenadas, solo vale la última pedida. */
  consultar(): void {
    if (this.rangoInvalido()) return;
    const numero = ++this.consulta;
    this.cargandoTabla.set(true);
    this.errorTabla.set(false);
    this.pedir(this.pestana(), this.filtro()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => {
        if (numero !== this.consulta) return;
        this.filas.set(datos);
        this.cargandoTabla.set(false);
      },
      error: (err) => {
        if (numero !== this.consulta) return;
        console.error('Error al consultar el reporte:', err);
        this.filas.set([]);
        this.errorTabla.set(true);
        this.cargandoTabla.set(false);
        this.toastService.showError('No se pudo cargar el reporte.');
      },
    });
  }

  private pedir(id: Pestana, filtro: FiltroReporte): Observable<unknown[]> {
    switch (id) {
      case 'lotes': return this.reporteService.getReporteLotes(filtro);
      case 'proyectos': return this.reporteService.getReporteProyectos(filtro);
      case 'etapas': return this.reporteService.getReporteEtapas(filtro);
      case 'estados-comerciales': return this.reporteService.getEstadosComerciales(filtro);
      case 'solicitudes': return this.reporteService.getReporteSolicitudes(filtro);
      case 'actividad': return this.reporteService.getReporteActividad(filtro);
    }
  }

  usa(filtro: FiltroUsado): boolean {
    return this.definicion().filtros.includes(filtro);
  }

  limpiarFiltros(): void {
    this.proyectoId.set(null);
    this.estadoLoteId.set(null);
    this.estadoSolicitudId.set(null);
    this.estadoProyecto.set(null);
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.incluirInactivos.set(false);
    this.consultar();
  }

  /** El "todos" de un selector llega como cadena vacía o "null"; se guarda como null. */
  numeroONulo(valor: unknown): number | null {
    return valor === null || valor === '' || valor === 'null' || valor === undefined ? null : Number(valor);
  }

  // --- Exportación ---

  exportar(formato: 'excel' | 'pdf'): void {
    if (this.rangoInvalido()) return;
    const reporte: ReporteId = this.pestana();
    const extension = formato === 'excel' ? 'xlsx' : 'pdf';
    const hoy = new Date().toISOString().slice(0, 10);
    const nombre = `Reporte_${this.definicion().archivo}_${hoy}.${extension}`;
    this.descargarArchivoBlob(this.reporteService.exportar(formato, reporte, this.filtro()), nombre);
  }

  descargarFichaPdf(): void {
    if (this.proyectoIdPdf == null) return;
    const proyectoId = Number(this.proyectoIdPdf);
    this.descargarArchivoBlob(
      this.reporteService.descargarFichaProyectoPdf(proyectoId),
      `Ficha_Tecnica_Proyecto_${proyectoId}.pdf`,
    );
  }

  private descargarArchivoBlob(peticion$: Observable<Blob>, nombreArchivo: string): void {
    this.cargando = true;
    peticion$.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cargando = false;
        this.toastService.showSuccess(`Archivo "${nombreArchivo}" descargado con éxito.`);
      },
      error: (err) => {
        console.error('Error al descargar el archivo:', err);
        this.cargando = false;
        this.toastService.showError('No se pudo completar la descarga del documento.');
      },
    });
  }

  // --- Indicadores ---

  /** Distribución de solicitudes por estado, para mostrarla como chips. */
  get solicitudesPorEstado(): { nombre: string; cantidad: number }[] {
    return Object.entries(this.stats.distribucionSolicitudesPorEstado ?? {})
      .map(([nombre, cantidad]) => ({ nombre: this.legible(nombre), cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  legible(valor: string): string {
    return legible(valor);
  }

  /** 50 → "50,0": un decimal y coma, como en el resto de la pantalla. */
  porcentaje(valor: string | number): string {
    return Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}
