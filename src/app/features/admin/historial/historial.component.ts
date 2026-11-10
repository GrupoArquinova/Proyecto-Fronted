import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { PaginaAuditoria, RegistroAuditoria } from '../../../core/models/auditoria.models';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { mensajeDeError } from '../../../core/utils/errores';
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
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
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

  /** Registros marcados con la casilla (solo de la página que se ve). */
  readonly seleccion = signal<ReadonlySet<number>>(new Set());
  readonly eliminando = signal(false);
  readonly cantidadSeleccionada = computed(() => this.seleccion().size);
  readonly todosMarcados = computed(() => this.filas().length > 0 && this.filas().every(f => this.seleccion().has(f.id)));
  readonly algunoMarcado = computed(() => this.seleccion().size > 0 && !this.todosMarcados());
  /** Los filtros ya aplicados no dejan nada: borrar "lo filtrado" sería borrar TODO el historial. */
  readonly sinFiltros = signal(true);
  readonly etiquetaFiltrados = computed(() => this.sinFiltros()
    ? `Eliminar todo el historial (${this.total()})`
    : `Eliminar los ${this.total()} registros filtrados`);

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

  /** Atajo para limpiar por fecha: muestra los registros de más de N días (así se ve qué se va a borrar antes de borrarlo). */
  filtrarAnterioresA(dias: number): void {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    this.filtros = { ...this.filtros, desde: '', hasta: fechaIso(limite) };
    this.buscar();
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

  alternar(id: number): void {
    const nueva = new Set(this.seleccion());
    if (nueva.has(id)) nueva.delete(id); else nueva.add(id);
    this.seleccion.set(nueva);
  }

  /** Marca (o desmarca) todos los registros de la página que se ve. */
  alternarTodos(): void {
    this.seleccion.set(this.todosMarcados() ? new Set() : new Set(this.filas().map(f => f.id)));
  }

  quitarSeleccion(): void {
    this.seleccion.set(new Set());
  }

  async eliminarSeleccionados(): Promise<void> {
    const ids = [...this.seleccion()];
    if (ids.length === 0 || this.eliminando()) return;
    const ok = await this.confirmDialog.open({
      title: 'Eliminar del historial',
      message: `¿Eliminar ${ids.length === 1 ? 'el registro elegido' : `los ${ids.length} registros elegidos`}? Esta acción no se puede deshacer. `
        + 'Quedará anotado en el historial que se hizo esta limpieza.',
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });
    if (!ok) return;
    this.ejecutar(this.servicio.eliminarSeleccion(ids));
  }

  /** Elimina todo lo que coincide con los filtros aplicados; si no hay filtros, es todo el historial y se pide una segunda confirmación. */
  async eliminarFiltrados(): Promise<void> {
    const total = this.total();
    if (total === 0 || this.eliminando()) return;
    const todo = this.sinFiltros();
    const primera = await this.confirmDialog.open({
      title: todo ? 'Eliminar TODO el historial' : 'Eliminar los registros filtrados',
      message: todo
        ? `Vas a eliminar los ${total} registros del historial de cambios. Esta acción no se puede deshacer.`
        : `Vas a eliminar los ${total} registros que coinciden con los filtros aplicados (en todas las páginas, no solo en esta). Esta acción no se puede deshacer.`,
      confirmText: todo ? 'Continuar' : 'Sí, eliminar',
      type: 'danger'
    });
    if (!primera) return;
    if (todo) {
      const segunda = await this.confirmDialog.open({
        title: 'Última confirmación',
        message: `Se borrarán los ${total} registros y no se podrán recuperar. ¿Eliminar todo el historial?`,
        confirmText: 'Sí, eliminar todo',
        type: 'danger'
      });
      if (!segunda) return;
    }
    const a = this.aplicados;
    this.ejecutar(this.servicio.eliminarFiltrados({
      usuarioId: a.usuarioId ? Number(a.usuarioId) : null, entidad: a.entidad, accion: a.accion, texto: a.texto, desde: a.desde, hasta: a.hasta
    }, todo));
  }

  private ejecutar(peticion: Observable<number>): void {
    this.eliminando.set(true);
    peticion.subscribe({
      next: (cuantos) => {
        this.eliminando.set(false);
        this.toast.showSuccess(cuantos === 1 ? 'Se eliminó 1 registro del historial.' : `Se eliminaron ${cuantos} registros del historial.`);
        this.cargarFiltrosDisponibles();
        this.cargar(this.pagina()?.pagina ?? 0);
      },
      error: (err) => {
        this.eliminando.set(false);
        this.toast.showError(mensajeDeError(err, 'No se pudo eliminar. Inténtalo de nuevo.'));
      }
    });
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
    this.cargarFiltrosDisponibles();
  }

  /** Entidades y acciones que existen en el historial (cambian al eliminar registros). */
  private cargarFiltrosDisponibles(): void {
    this.servicio.filtros().subscribe({
      next: (f) => { this.entidades.set(f.entidades); this.acciones.set(f.acciones); },
      error: () => undefined
    });
  }

  private cargar(pagina: number): void {
    this.estado.set('cargando');
    this.seleccion.set(new Set());
    const a = this.aplicados;
    this.sinFiltros.set(!a.usuarioId && !a.entidad && !a.accion && !a.texto.trim() && !a.desde && !a.hasta);
    this.peticion?.unsubscribe();
    this.peticion = this.servicio.listar({ ...this.aplicados, usuarioId: this.aplicados.usuarioId ? Number(this.aplicados.usuarioId) : null, page: Math.max(0, pagina), size: this.tamanoPagina }).subscribe({
      next: (datos) => {
        // Si se eliminó la última fila de esta página, se vuelve a la anterior en lugar de mostrar una página vacía
        if (datos.contenido.length === 0 && datos.pagina > 0 && datos.totalPaginas > 0) {
          this.cargar(Math.min(datos.pagina - 1, datos.totalPaginas - 1));
          return;
        }
        this.pagina.set(datos);
        this.estado.set('listo');
      },
      error: () => this.estado.set('error')
    });
  }
}
