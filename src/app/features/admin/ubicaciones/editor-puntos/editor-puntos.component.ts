import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Ubicacion } from '../../../../core/models/ubicacion.models';
import { Lote } from '../../../../core/models/lote.models';
import { Etapa } from '../../../../core/models/etapa.models';
import { Multimedia } from '../../../../core/models/multimedia.models';
import { ESCENAS_PUNTO, EscenaPunto, Punto360, Punto360Request } from '../../../../core/models/punto-360.models';
import { Punto360Service } from '../../../../core/services/punto-360.service';
import { LoteService } from '../../../../core/services/lote.service';
import { EtapaService } from '../../../../core/services/etapa.service';
import { MultimediaService } from '../../../../core/services/multimedia.service';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { clasificarMedio } from '../../../../core/utils/medios';
import { validarArchivo } from '../../../../core/utils/archivos';
import { ordenarLotes } from '../../../../core/utils/lotes';
import { esLugarCercano, esPuntoDePlano, tituloDeLote } from '../../../../core/utils/puntos';
import { PosicionPanorama, Visor360Component } from '../../../public/proyecto-detalle/secciones/visor-360/visor-360.component';
import { PlanoPuntosComponent, PosicionPlano360 } from '../../../public/proyecto-detalle/secciones/plano-puntos/plano-puntos.component';

/**
 * Editor de los botones que se ven sobre el entorno 360°, la vista aérea y el plano de urbanismo de un proyecto:
 * se hace clic en el lugar de la imagen, se elige el lote (o la etapa, en el plano) y se guarda.
 */
@Component({
  selector: 'app-editor-puntos',
  standalone: true,
  imports: [FormsModule, Visor360Component, PlanoPuntosComponent],
  templateUrl: './editor-puntos.component.html',
  styleUrl: './editor-puntos.component.scss'
})
export class EditorPuntosComponent {
  private puntoService = inject(Punto360Service);
  private loteService = inject(LoteService);
  private etapaService = inject(EtapaService);
  private multimediaService = inject(MultimediaService);
  private cloudinary = inject(CloudinaryService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  readonly ubicacion = input.required<Ubicacion>();
  readonly cerrar = output<void>();

  private visor = viewChild(Visor360Component);

  readonly escena = signal<EscenaPunto | null>(null);
  readonly puntos = signal<Punto360[]>([]);
  readonly lotes = signal<Lote[]>([]);
  readonly etapas = signal<Etapa[]>([]);
  readonly guardando = signal(false);

  /** Imagen 360° de cada lote (id del lote → recurso), para saber a cuáles ya se les subió. */
  readonly panoramas = signal<Map<number, Multimedia>>(new Map());
  /** Lote al que se le está subiendo su imagen 360° en este momento. */
  readonly subiendoLote = signal<number | null>(null);

  /** Dónde se va a colocar el botón nuevo (aún sin guardar). */
  readonly pendiente360 = signal<PosicionPanorama | null>(null);
  readonly pendientePlano = signal<PosicionPlano360 | null>(null);

  // Formulario del botón nuevo
  readonly loteId = signal<number | null>(null);
  readonly etapaId = signal<number | null>(null);
  readonly etiqueta = signal('');
  /** Entorno 360°: solo rótulos de lugares cercanos (sin tarjeta). Vista aérea: solo botones de lotes. */
  readonly esLugar = computed(() => this.escena() === 'ENTORNO');

  /** Solo se pueden editar las imágenes que el administrador ya cargó en la ubicación y que son imagen. */
  readonly escenas = computed(() => {
    const u = this.ubicacion();
    const url: Record<EscenaPunto, string | undefined> = {
      ENTORNO: u.recorrido360Url, AEREA: u.vistaAereaUrl, URBANISMO: u.urbanismoUrl
    };
    return ESCENAS_PUNTO
      .filter(e => clasificarMedio(url[e.id]).tipo === 'imagen')
      .map(e => ({ ...e, url: url[e.id]! }));
  });

  readonly escenaActual = computed(() => this.escenas().find(e => e.id === this.escena()) ?? null);
  readonly esPlano = computed(() => this.escena() != null && esPuntoDePlano({ escena: this.escena()! }));

  readonly puntosDeEscena = computed(() => this.puntos().filter(p => p.escena === this.escena()
    && (this.escena() === 'URBANISMO' || esLugarCercano(p) === this.esLugar())));
  readonly hayPendiente = computed(() => this.esPlano() ? this.pendientePlano() != null : this.pendiente360() != null);

  /** Lotes ya usados en esta imagen no se vuelven a ofrecer. */
  readonly lotesLibres = computed(() => {
    const usados = new Set(this.puntosDeEscena().map(p => p.loteId));
    return ordenarLotes(this.lotes()).filter(l => l.id != null && !usados.has(l.id));
  });

  readonly tituloDeLote = tituloDeLote;

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  private cargar(): void {
    const proyectoId = this.ubicacion().proyectoId;
    this.escena.set(this.escenas()[0]?.id ?? null);

    this.puntoService.listarPorProyecto(proyectoId).subscribe({
      next: lista => this.puntos.set(lista),
      error: () => this.toast.showError('No se pudieron cargar los botones del proyecto.')
    });
    this.loteService.obtenerLotes().subscribe({
      next: lista => this.lotes.set(lista.filter(l => l.proyectoId === proyectoId && l.activo)),
      error: () => this.toast.showError('No se pudieron cargar los lotes.')
    });
    this.multimediaService.obtenerMultimedia().subscribe({
      next: lista => this.panoramas.set(new Map(
        lista.filter(m => m.tipo === 'PANORAMICA_360' && m.loteId != null && m.activo).map(m => [m.loteId!, m]))),
      error: () => undefined
    });
    this.etapaService.listarPorProyecto(proyectoId).subscribe({
      next: lista => this.etapas.set(lista),
      error: () => undefined
    });
  }

  elegirEscena(escena: EscenaPunto): void {
    this.escena.set(escena);
    this.limpiarFormulario();
  }

  clicEn360(posicion: PosicionPanorama): void {
    this.pendiente360.set(posicion);
  }

  clicEnPlano(posicion: PosicionPlano360): void {
    this.pendientePlano.set(posicion);
  }

  /** Al elegir un lote o etapa, la etiqueta se rellena con su código o nombre (se puede cambiar). */
  elegirLote(id: number | null): void {
    this.loteId.set(id);
    const lote = this.lotes().find(l => l.id === id);
    if (lote) this.etiqueta.set(lote.codigo);
  }

  elegirEtapa(id: number | null): void {
    this.etapaId.set(id);
    const etapa = this.etapas().find(e => e.id === id);
    if (etapa?.nombre) this.etiqueta.set(etapa.nombre);
  }

  puedeGuardar(): boolean {
    const tieneDestino = this.esPlano() ? this.etapaId() != null : (this.esLugar() || this.loteId() != null);
    return this.hayPendiente() && tieneDestino && this.etiqueta().trim().length > 0 && !this.guardando();
  }

  guardar(): void {
    const escena = this.escena();
    if (!escena || !this.puedeGuardar()) return;

    const base: Punto360Request = {
      proyectoId: this.ubicacion().proyectoId,
      escena,
      etiqueta: this.etiqueta().trim(),
      loteId: this.esPlano() || this.esLugar() ? null : this.loteId(),
      etapaId: this.esPlano() ? this.etapaId() : null
    };
    const pendiente360 = this.pendiente360();
    const pendientePlano = this.pendientePlano();
    const peticion: Punto360Request = this.esPlano()
      ? { ...base, posX: pendientePlano!.x, posY: pendientePlano!.y }
      : { ...base, yaw: pendiente360!.yaw, pitch: pendiente360!.pitch };

    this.guardando.set(true);
    this.puntoService.crear(peticion).subscribe({
      next: creado => {
        this.puntos.update(lista => [...lista, creado]);
        this.guardando.set(false);
        this.limpiarFormulario();
        this.toast.showSuccess('Botón guardado');
      },
      error: err => {
        console.error('Error al guardar el botón:', err);
        this.guardando.set(false);
        this.toast.showError('No se pudo guardar el botón. Revisa los datos e inténtalo de nuevo.');
      }
    });
  }

  /** Un botón de lote puede tener su propia imagen 360°; el plano (etapas) no. */
  tienePanorama(punto: Punto360): boolean {
    return punto.loteId != null && this.panoramas().has(punto.loteId);
  }

  /**
   * Sube la imagen 360° del lote al que apunta el botón y la deja guardada en su multimedia
   * (la misma que se ve en la tarjeta del sitio). Si ya tenía una, la reemplaza.
   */
  subir360(punto: Punto360, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    const loteId = punto.loteId;
    if (!archivo || loteId == null) return;

    const problema = validarArchivo(archivo, ['imagen']);
    if (problema) {
      this.toast.showError(problema);
      return;
    }

    this.subiendoLote.set(loteId);
    this.cloudinary.subirArchivo(archivo).subscribe({
      next: resultado => {
        const anterior = this.panoramas().get(loteId);
        this.multimediaService.crearMultimedia({
          loteId,
          tipo: 'PANORAMICA_360',
          titulo: `Imagen 360° del lote ${punto.loteCodigo ?? punto.etiqueta}`,
          url: resultado.url,
          nombreArchivo: archivo.name,
          orden: 1,
          portada: false,
          publicado: true,
          activo: true
        }).subscribe({
          next: creado => {
            this.panoramas.update(mapa => new Map(mapa).set(loteId, creado));
            this.subiendoLote.set(null);
            this.toast.showSuccess('Imagen 360° del lote guardada');
            if (anterior?.id != null) this.multimediaService.eliminarMultimedia(anterior.id).subscribe({ error: () => undefined });
          },
          error: err => {
            console.error('Error al guardar la imagen 360° del lote:', err);
            this.subiendoLote.set(null);
            this.toast.showError('La imagen se subió pero no se pudo guardar en el lote.');
          }
        });
      },
      error: err => {
        console.error('Error al subir la imagen 360° del lote:', err);
        this.subiendoLote.set(null);
        this.toast.showError('No se pudo subir la imagen. Inténtalo de nuevo.');
      }
    });
  }

  verEnLaImagen(punto: Punto360): void {
    if (punto.yaw != null && punto.pitch != null) {
      this.visor()?.irA({ yaw: Number(punto.yaw), pitch: Number(punto.pitch) });
    }
  }

  async quitar(punto: Punto360): Promise<void> {
    if (punto.id == null) return;
    const ok = await this.confirm.open({
      title: 'Quitar botón',
      message: `¿Quitar el botón "${punto.etiqueta}" de la imagen?`,
      confirmText: 'Sí, quitar',
      type: 'danger'
    });
    if (!ok) return;

    this.puntoService.eliminar(punto.id).subscribe({
      next: () => this.puntos.update(lista => lista.filter(p => p.id !== punto.id)),
      error: () => this.toast.showError('No se pudo quitar el botón.')
    });
  }

  private limpiarFormulario(): void {
    this.pendiente360.set(null);
    this.pendientePlano.set(null);
    this.loteId.set(null);
    this.etapaId.set(null);
    this.etiqueta.set('');
  }
}
