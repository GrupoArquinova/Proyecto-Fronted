import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginaAuditoria, RegistroAuditoria } from '../../../core/models/auditoria.models';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { claseDeAccion, rutaDeEntidad } from '../../../core/utils/auditoria';
import { fechaHoraLocal, fechaIso, humanizar } from '../../../core/utils/metricas';

type Estado = 'cargando' | 'listo' | 'error';

/** "Historial de cambios": quién editó qué y cuándo. Solo administrador. */
// Sin OnPush a propósito (decisión del panel de administración).
@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss'
})
export class HistorialComponent implements OnInit {
  private servicio = inject(AuditoriaService);
  private usuarioService = inject(UsuarioService);
  private destroyRef = inject(DestroyRef);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private peticion?: Subscription;

  readonly tamanoPagina = 25;
  /** Opciones de los selectores (si no cargan, el selector queda solo con "Todos"). */
  readonly usuarios = signal<{ id: number; nombre: string }[]>([]);
  readonly entidades = signal<string[]>([]);
  readonly acciones = signal<string[]>([]);
  readonly hoy = fechaIso(new Date());

  filtros = { usuarioId: '', entidad: '', accion: '', texto: '', desde: '', hasta: '' };
  /** Filtros ya aplicados (los que se mandaron al backend), para paginar sin que cambie lo que se ve en los campos. */
  private aplicados = { ...this.filtros };

  readonly estado = signal<Estado>('cargando');
  readonly pagina = signal<PaginaAuditoria | null>(null);
  readonly errorFiltros = signal('');

  readonly filas = computed(() =>
    (this.pagina()?.contenido ?? []).map((r: RegistroAuditoria) => ({
      id: r.id,
      fecha: fechaHoraLocal(r.creadoEn),
      fechaIso: r.creadoEn,
      usuario: r.usuarioNombre || '—',
      accion: humanizar(r.accion),
      clase: claseDeAccion(r.accion),
      entidad: humanizar(r.entidad),
      entidadId: r.entidadId ?? null,
      ruta: rutaDeEntidad(r.entidad),
      descripcion: r.descripcion?.trim() || '—'
    }))
  );

  readonly numeroPagina = computed(() => (this.pagina()?.pagina ?? 0) + 1);
  readonly totalPaginas = computed(() => Math.max(1, this.pagina()?.totalPaginas ?? 1));
  readonly total = computed(() => this.pagina()?.totalElementos ?? 0);
  readonly hayAnterior = computed(() => (this.pagina()?.pagina ?? 0) > 0);
  readonly haySiguiente = computed(() => (this.pagina()?.pagina ?? 0) + 1 < (this.pagina()?.totalPaginas ?? 0));

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.peticion?.unsubscribe());
    if (this.enNavegador) {
      this.cargarOpciones();
      this.cargar(0);
    }
  }

  buscar(): void {
    if (this.filtros.desde && this.filtros.hasta && this.filtros.desde > this.filtros.hasta) {
      this.errorFiltros.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.errorFiltros.set('');
    this.aplicados = { ...this.filtros };
    this.cargar(0);
  }

  limpiar(): void {
    this.filtros = { usuarioId: '', entidad: '', accion: '', texto: '', desde: '', hasta: '' };
    this.errorFiltros.set('');
    this.aplicados = { ...this.filtros };
    this.cargar(0);
  }

  irA(pagina: number): void {
    this.cargar(pagina);
  }

  reintentar(): void {
    this.cargar(this.pagina()?.pagina ?? 0);
  }

  /** Llena los selectores de usuario, entidad y acción; si falla alguno, ese selector queda vacío y la pantalla sigue funcionando. */
  private cargarOpciones(): void {
    this.usuarioService.listar().subscribe({
      next: (lista) => this.usuarios.set(lista.filter(u => u.id != null).map(u => ({ id: u.id as number, nombre: u.nombreCompleto }))),
      error: () => undefined
    });
    this.servicio.filtros().subscribe({
      next: (f) => { this.entidades.set(f.entidades); this.acciones.set(f.acciones); },
      error: () => undefined
    });
  }

  private cargar(pagina: number): void {
    this.estado.set('cargando');
    this.peticion?.unsubscribe();
    this.peticion = this.servicio.listar({ ...this.aplicados, usuarioId: this.aplicados.usuarioId ? Number(this.aplicados.usuarioId) : null, page: Math.max(0, pagina), size: this.tamanoPagina }).subscribe({
      next: (datos) => {
        this.pagina.set(datos);
        this.estado.set('listo');
      },
      error: () => this.estado.set('error')
    });
  }
}
