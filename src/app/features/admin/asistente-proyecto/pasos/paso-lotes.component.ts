import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, concatMap, from, map, of } from 'rxjs';
import { AsistenteProyectoService } from '../asistente-proyecto.service';
import { LoteService } from '../../../../core/services/lote.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { Lote } from '../../../../core/models/lote.models';
import {
  FilaLote, MAX_LOTES_POR_TANDA, filaValida, filasConCodigoRepetido, generarFilas, proximoNumero
} from '../../../../core/utils/lotes-masivos';
import { estadoDeLote, formatoArea } from '../../../../core/utils/lotes';

// Los ids coinciden con los estados que crea la base de datos (estados_lote)
const ESTADOS = [
  { id: 1, nombre: 'Disponible' },
  { id: 2, nombre: 'Reservado' },
  { id: 3, nombre: 'Vendido' }
];

@Component({
  selector: 'app-paso-lotes',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './paso.scss',
  template: `
    <h2>Lotes</h2>
    <p class="intro">Genera varios lotes de una vez (por ejemplo LT-01 a LT-20), revísalos en la tabla y guárdalos. Puedes repetirlo por cada etapa.</p>

    @if (asistente.etapas().length === 0) {
      <p class="aviso">Primero crea al menos una etapa en el paso 3.</p>
    } @else {
      <section class="bloque" aria-label="Generar lotes">
        <h3>Generar lotes</h3>
        <div class="fila">
          <label>Etapa
            <select [ngModel]="etapaId()" (ngModelChange)="cambiarEtapa($event)">
              @for (e of asistente.etapas(); track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
            </select>
          </label>
          <label>Prefijo del código
            <input type="text" [ngModel]="prefijo()" (ngModelChange)="cambiarPrefijo($event)" maxlength="20" />
          </label>
          <label>Empezar en
            <input type="number" min="1" [ngModel]="desde()" (ngModelChange)="desde.set($event)" />
          </label>
          <label>Cantidad
            <input type="number" min="1" [max]="maximo" [ngModel]="cantidad()" (ngModelChange)="cantidad.set($event)" />
          </label>
          <label>Área (m²)
            <input type="number" min="1" step="any" [ngModel]="area()" (ngModelChange)="area.set($event)" />
          </label>
          <label>Estado
            <select [ngModel]="estadoId()" (ngModelChange)="estadoId.set($event)">
              @for (e of estados; track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
            </select>
          </label>
        </div>
        <button type="button" class="secundario generar" (click)="generar()">Generar filas</button>
        @if (errorGeneracion()) { <small class="error">{{ errorGeneracion() }}</small> }
      </section>

      @if (filas().length > 0) {
        <section class="bloque" aria-label="Lotes por guardar">
          <h3>Por guardar ({{ filas().length }})</h3>
          <div class="tabla" role="table">
            <div class="encabezado" role="row"><span>Etapa</span><span>Código</span><span>Área m²</span><span>Estado</span><span></span></div>
            @for (f of filas(); track f.clave) {
              <div class="fila-tabla" role="row" [class.con-error]="f.error || repetidas().has(f.clave)">
                <span class="etapa">{{ nombreEtapa(f.etapaId) }}</span>
                <input type="text" [ngModel]="f.codigo" (ngModelChange)="editar(f.clave, 'codigo', $event)" maxlength="50"
                       [class.invalido]="repetidas().has(f.clave) || !f.codigo.trim()" aria-label="Código" />
                <input type="number" min="1" step="any" [ngModel]="f.areaM2" (ngModelChange)="editar(f.clave, 'areaM2', $event)"
                       [class.invalido]="!(f.areaM2 && f.areaM2 > 0)" aria-label="Área" />
                <select [ngModel]="f.estadoId" (ngModelChange)="editar(f.clave, 'estadoId', $event)" aria-label="Estado">
                  @for (e of estados; track e.id) { <option [ngValue]="e.id">{{ e.nombre }}</option> }
                </select>
                <button type="button" class="quitar" (click)="quitarFila(f.clave)" aria-label="Quitar fila">Quitar</button>
                @if (repetidas().has(f.clave)) { <small class="error mensaje">Este código ya existe en la etapa.</small> }
                @else if (f.error) { <small class="error mensaje">{{ f.error }}</small> }
              </div>
            }
          </div>

          <div class="acciones-bloque">
            <button type="button" class="secundario" (click)="descartar()" [disabled]="guardando()">Descartar</button>
            <button type="button" class="primario" (click)="guardar()" [disabled]="guardando() || !puedeGuardar()">
              {{ guardando() ? 'Guardando ' + progreso() + ' de ' + total() + '...' : 'Guardar ' + filas().length + ' lotes' }}
            </button>
          </div>
        </section>
      }
    }

    <section class="bloque" aria-label="Lotes guardados">
      <h3>Lotes guardados ({{ asistente.lotes().length }})</h3>
      @for (grupo of guardadosPorEtapa(); track grupo.etapa) {
        <div class="grupo">
          <p class="grupo-titulo">{{ grupo.etapa }} <span>{{ grupo.lotes.length }}</span></p>
          <ul class="chips">
            @for (l of grupo.lotes; track l.id) {
              <li [class]="estado(l)">
                <span><strong>{{ l.codigo }}</strong> {{ areaDe(l) }}</span>
                <button type="button" (click)="eliminar(l)" [attr.aria-label]="'Eliminar lote ' + l.codigo">×</button>
              </li>
            }
          </ul>
        </div>
      } @empty {
        <p class="vacio">Todavía no hay lotes guardados.</p>
      }
    </section>

    <div class="acciones">
      <button type="button" class="secundario" (click)="asistente.anterior()" [disabled]="guardando()">Atrás</button>
      <button type="button" class="primario" (click)="asistente.siguiente()" [disabled]="guardando()">
        {{ asistente.lotes().length === 0 ? 'Omitir por ahora' : 'Continuar' }}
      </button>
    </div>
  `,
  styles: [`
    .bloque { margin-bottom: 1.4rem; padding: 1.2rem 1.3rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    .bloque h3 { margin: 0 0 0.9rem; font-size: 1rem; color: #1e293b; }
    .generar { margin-top: 1rem; }
    .aviso, .vacio { padding: 1rem; background: #fef9c3; border-radius: 8px; color: #854d0e; margin: 0 0 1.2rem; }
    .vacio { background: transparent; color: #94a3b8; text-align: center; padding: 0.4rem; margin: 0; }
    .tabla { display: grid; gap: 0.4rem; }
    .encabezado, .fila-tabla { display: grid; grid-template-columns: 1.6fr 1.2fr 0.9fr 1.1fr auto; gap: 0.5rem; align-items: center; }
    .encabezado { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 0 0.3rem; }
    .fila-tabla { padding: 0.4rem 0.3rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
    .fila-tabla.con-error { border-color: #fca5a5; background: #fef2f2; }
    .fila-tabla .etapa { font-size: 0.82rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fila-tabla input, .fila-tabla select { padding: 0.45rem 0.55rem; }
    .mensaje { grid-column: 1 / -1; }
    .quitar { padding: 0.3rem 0.6rem; background: none; border: none; color: #dc2626; font-size: 0.82rem; font-weight: 600; }
    .acciones-bloque { display: flex; justify-content: flex-end; gap: 0.7rem; margin-top: 1rem; }
    .grupo { margin-bottom: 0.8rem; }
    .grupo-titulo { margin: 0 0 0.4rem; font-weight: 600; font-size: 0.9rem; color: #475569; }
    .grupo-titulo span { margin-left: 0.3rem; padding: 0.05rem 0.5rem; background: #e8f0ef; color: #2c5953; border-radius: 999px; font-size: 0.78rem; }
    .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chips li { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.4rem 0.3rem 0.7rem; background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #94a3b8; border-radius: 8px; font-size: 0.85rem; }
    .chips li.disponible { border-left-color: #2f9e63; }
    .chips li.reservado { border-left-color: #d9951a; }
    .chips li.vendido { border-left-color: #c94a4a; }
    .chips li button { padding: 0 0.4rem; background: none; border: none; color: #94a3b8; font-size: 1.1rem; line-height: 1; }
    .chips li button:hover { color: #dc2626; }
    @media (max-width: 760px) {
      .encabezado { display: none; }
      .fila-tabla { grid-template-columns: 1fr 1fr; }
      .fila-tabla .etapa { grid-column: 1 / -1; }
    }
  `]
})
export class PasoLotesComponent {
  readonly asistente = inject(AsistenteProyectoService);
  private loteService = inject(LoteService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  readonly estados = ESTADOS;
  readonly maximo = MAX_LOTES_POR_TANDA;

  // Parámetros del generador
  readonly etapaId = signal<number>(this.asistente.etapas()[0]?.id ?? 0);
  readonly prefijo = signal('LT-');
  readonly desde = signal(1);
  readonly cantidad = signal(10);
  readonly area = signal<number | null>(null);
  readonly estadoId = signal(1);
  readonly errorGeneracion = signal('');

  readonly filas = signal<FilaLote[]>([]);
  readonly guardando = signal(false);
  readonly progreso = signal(0);
  readonly total = signal(0);

  private siguienteClave = 1;

  /** Filas cuyo código choca con uno ya guardado o con otra fila de la misma etapa. */
  readonly repetidas = computed(() => filasConCodigoRepetido(this.filas(), this.asistente.lotes()));
  readonly puedeGuardar = computed(() =>
    this.filas().length > 0 && this.filas().every(filaValida) && this.repetidas().size === 0);

  readonly guardadosPorEtapa = computed(() => {
    const grupos = new Map<string, Lote[]>();
    for (const lote of this.asistente.lotes()) {
      const etapa = lote.etapaNombre ?? 'Sin etapa';
      grupos.set(etapa, [...(grupos.get(etapa) ?? []), lote]);
    }
    return [...grupos.entries()].map(([etapa, lotes]) => ({ etapa, lotes }));
  });

  constructor() {
    this.sugerirInicio();
  }

  cambiarEtapa(id: number): void {
    this.etapaId.set(id);
    this.sugerirInicio();
  }

  cambiarPrefijo(valor: string): void {
    this.prefijo.set(valor);
    this.sugerirInicio();
  }

  /** Propone el siguiente número libre para no chocar con lotes ya guardados. */
  private sugerirInicio(): void {
    this.desde.set(proximoNumero(this.asistente.lotes(), this.etapaId(), this.prefijo()));
  }

  nombreEtapa(id: number): string {
    return this.asistente.etapas().find(e => e.id === id)?.nombre ?? '';
  }

  generar(): void {
    this.errorGeneracion.set('');
    const cantidad = Number(this.cantidad());
    const area = Number(this.area());
    if (!this.etapaId()) return void this.errorGeneracion.set('Elige una etapa.');
    if (!Number.isFinite(cantidad) || cantidad < 1) return void this.errorGeneracion.set('Escribe cuántos lotes quieres generar.');
    if (!Number.isFinite(area) || area <= 0) return void this.errorGeneracion.set('Escribe el área de los lotes (mayor que cero).');

    const nuevas = generarFilas({
      etapaId: this.etapaId(), prefijo: this.prefijo().trim(), desde: Math.max(1, Math.floor(Number(this.desde()) || 1)),
      cantidad, areaM2: area, estadoId: this.estadoId()
    }, this.siguienteClave);

    this.siguienteClave += nuevas.length;
    this.filas.update(actuales => [...actuales, ...nuevas]);
  }

  editar<K extends 'codigo' | 'areaM2' | 'estadoId'>(clave: number, campo: K, valor: FilaLote[K]): void {
    this.filas.update(lista => lista.map(f => (f.clave === clave ? { ...f, [campo]: valor, error: undefined } : f)));
  }

  quitarFila(clave: number): void {
    this.filas.update(lista => lista.filter(f => f.clave !== clave));
  }

  descartar(): void {
    this.filas.set([]);
  }

  /** Guarda una por una (el backend no tiene creación masiva). Las que fallan se quedan en la tabla con su motivo. */
  guardar(): void {
    const pendientes = this.filas();
    if (!this.puedeGuardar()) return;

    this.guardando.set(true);
    this.progreso.set(0);
    this.total.set(pendientes.length);
    let fallidas = 0;

    from(pendientes).pipe(
      concatMap(fila =>
        this.loteService.crearLote({
          etapaId: fila.etapaId, estadoId: fila.estadoId, codigo: fila.codigo.trim(), areaM2: fila.areaM2 as number, activo: true
        }).pipe(
          map(lote => ({ fila, lote, error: '' })),
          catchError((err: HttpErrorResponse) => of({ fila, lote: null, error: this.motivo(err) }))
        )
      )
    ).subscribe({
      next: ({ fila, lote, error }) => {
        this.progreso.update(n => n + 1);
        if (lote) {
          // Se completan los datos que el servidor devuelve a medias con lo que ya sabemos de la etapa
          const guardado: Lote = { ...lote, proyectoId: this.asistente.proyectoId() ?? undefined, etapaNombre: lote.etapaNombre ?? this.nombreEtapa(fila.etapaId) };
          this.asistente.lotes.update(l => [...l, guardado]);
          this.filas.update(lista => lista.filter(f => f.clave !== fila.clave));
        } else {
          fallidas++;
          this.filas.update(lista => lista.map(f => (f.clave === fila.clave ? { ...f, error } : f)));
        }
      },
      complete: () => {
        this.guardando.set(false);
        this.sugerirInicio();
        if (fallidas === 0) this.toast.showSuccess(`${pendientes.length} lotes guardados`);
        else this.toast.showError(`${fallidas} lotes no se pudieron guardar. Revisa los avisos en la tabla.`);
      }
    });
  }

  private motivo(err: HttpErrorResponse): string {
    if (err.status === 409) return 'Ya existe un lote con ese código en la etapa.';
    if (err.status === 400) return 'Datos no válidos. Revisa el código y el área.';
    return 'No se pudo guardar. Inténtalo de nuevo.';
  }

  estado(lote: Lote): string {
    return estadoDeLote(lote).clave;
  }

  areaDe(lote: Lote): string {
    return formatoArea(lote.areaM2);
  }

  async eliminar(lote: Lote): Promise<void> {
    if (lote.id == null) return;
    const ok = await this.confirm.open({
      title: 'Eliminar lote',
      message: `¿Eliminar el lote "${lote.codigo}"? Se borra de forma permanente.`,
      confirmText: 'Sí, eliminar'
    });
    if (!ok) return;

    this.loteService.eliminarLote(lote.id).subscribe({
      next: () => {
        this.asistente.lotes.update(l => l.filter(x => x.id !== lote.id));
        this.sugerirInicio();
      },
      error: err => {
        console.error('Error al eliminar el lote:', err);
        this.toast.showError('No se pudo eliminar el lote.');
      }
    });
  }
}
