import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, switchMap, tap } from 'rxjs';
import { ProyectoService } from '../../../core/services/proyecto.service';
import { UbicacionService } from '../../../core/services/ubicacion.service';
import { EtapaService } from '../../../core/services/etapa.service';
import { Proyecto } from '../../../core/models/proyecto.models';
import { Ubicacion } from '../../../core/models/ubicacion.models';
import { Etapa } from '../../../core/models/etapa.models';

export type PasoAsistente = 1 | 2 | 3 | 4 | 5 | 6;

export interface PasoInfo {
  numero: PasoAsistente;
  titulo: string;
}

export const PASOS: PasoInfo[] = [
  { numero: 1, titulo: 'Proyecto' },
  { numero: 2, titulo: 'Ubicación' },
  { numero: 3, titulo: 'Etapas' },
  { numero: 4, titulo: 'Lotes' },
  { numero: 5, titulo: 'Zonas y casa modelo' },
  { numero: 6, titulo: 'Revisar y publicar' }
];

const CLAVE_BORRADOR = 'asistente_proyecto_borrador';

interface Borrador {
  proyectoId: number;
  paso: PasoAsistente;
}

/**
 * Estado del asistente de creación de proyectos. Cada paso guarda en el backend apenas se
 * confirma, así que el "borrador" es solo el id del proyecto y el paso: al volver se recarga
 * todo lo ya creado desde el servidor y se puede seguir donde se quedó.
 */
@Injectable()
export class AsistenteProyectoService {
  private proyectoService = inject(ProyectoService);
  private ubicacionService = inject(UbicacionService);
  private etapaService = inject(EtapaService);

  readonly proyecto = signal<Proyecto | null>(null);
  readonly ubicacion = signal<Ubicacion | null>(null);
  readonly etapas = signal<Etapa[]>([]);
  readonly paso = signal<PasoAsistente>(1);

  /** Paso más lejano al que se ha llegado; los anteriores quedan marcados como completos. */
  readonly pasoMaximo = signal<PasoAsistente>(1);

  readonly tieneProyecto = computed(() => this.proyecto()?.id != null);
  readonly proyectoId = computed(() => this.proyecto()?.id ?? null);

  /** Lee el borrador guardado y carga sus datos. Emite true si había uno recuperable. */
  retomarBorrador(): Observable<boolean> {
    const borrador = this.leerBorrador();
    if (!borrador) return of(false);

    return this.proyectoService.getProyectoPorId(borrador.proyectoId).pipe(
      switchMap(proyecto => {
        this.proyecto.set(proyecto);
        return this.cargarRelacionados(borrador.proyectoId);
      }),
      tap(() => {
        this.paso.set(borrador.paso);
        this.pasoMaximo.set(borrador.paso);
      }),
      switchMap(() => of(true))
    );
  }

  private cargarRelacionados(proyectoId: number): Observable<unknown> {
    return forkJoin({
      ubicacion: this.ubicacionService.obtenerPorProyecto(proyectoId),
      etapas: this.etapaService.listarPorProyecto(proyectoId)
    }).pipe(tap(({ ubicacion, etapas }) => {
      this.ubicacion.set(ubicacion);
      this.etapas.set(etapas);
    }));
  }

  /** Registra el proyecto recién creado o actualizado y deja el borrador guardado. */
  fijarProyecto(proyecto: Proyecto): void {
    this.proyecto.set(proyecto);
    this.guardarBorrador();
  }

  irAPaso(numero: PasoAsistente): void {
    if (numero > this.pasoMaximo() || (numero > 1 && !this.tieneProyecto())) return;
    this.paso.set(numero);
    this.guardarBorrador();
  }

  siguiente(): void {
    const proximo = Math.min(6, this.paso() + 1) as PasoAsistente;
    if (proximo > this.pasoMaximo()) this.pasoMaximo.set(proximo);
    this.paso.set(proximo);
    this.guardarBorrador();
  }

  anterior(): void {
    this.paso.set(Math.max(1, this.paso() - 1) as PasoAsistente);
    this.guardarBorrador();
  }

  /** Borra el borrador y deja el asistente en blanco para un proyecto nuevo. */
  reiniciar(): void {
    this.proyecto.set(null);
    this.ubicacion.set(null);
    this.etapas.set([]);
    this.paso.set(1);
    this.pasoMaximo.set(1);
    try { localStorage.removeItem(CLAVE_BORRADOR); } catch { /* sin almacenamiento: no hay borrador que borrar */ }
  }

  private guardarBorrador(): void {
    const id = this.proyectoId();
    if (id == null) return;
    const borrador: Borrador = { proyectoId: id, paso: this.paso() };
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador)); } catch { /* el borrador es una comodidad */ }
  }

  private leerBorrador(): Borrador | null {
    try {
      const crudo = localStorage.getItem(CLAVE_BORRADOR);
      const dato = crudo ? JSON.parse(crudo) : null;
      return dato && Number.isInteger(dato.proyectoId) && dato.paso >= 1 && dato.paso <= 6 ? dato : null;
    } catch {
      return null;
    }
  }
}
