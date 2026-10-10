import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { Ubicacion } from '../../../../core/models/ubicacion.models';
import { Lote } from '../../../../core/models/lote.models';
import { Etapa } from '../../../../core/models/etapa.models';
import { Multimedia } from '../../../../core/models/multimedia.models';
import { ZonaComun } from '../../../../core/models/zona-comun.models';
import { ESCENAS_PUNTO, EscenaPunto, Punto360, Punto360Request } from '../../../../core/models/punto-360.models';
import { Punto360Service } from '../../../../core/services/punto-360.service';
import { LoteService } from '../../../../core/services/lote.service';
import { EtapaService } from '../../../../core/services/etapa.service';
import { ZonaComunService } from '../../../../core/services/zona-comun.service';
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
  private zonaService = inject(ZonaComunService);
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

  /** Zonas destacadas: zonas comunes del proyecto, imagen de fondo y el 360° de cada zona. */
  readonly zonas = signal<ZonaComun[]>([]);
  readonly imagenZonas = signal<Multimedia | null>(null);
  readonly subiendoImagenZonas = signal(false);
  readonly panoramasZona = signal<Map<number, Multimedia>>(new Map());
  readonly subiendoZona = signal<number | null>(null);
  readonly zonaId = signal<number | null>(null);

  /** Imágenes de cada etapa (id de la etapa → recursos), las que se ven en la tarjeta al pulsar su botón del plano. */
  readonly imagenesEtapa = signal<Map<number, Multimedia[]>>(new Map());
  /** Imagen 360° de cada etapa (id de la etapa → recurso). */
  readonly panoramasEtapa = signal<Map<number, Multimedia>>(new Map());
  /** Etapa a la que se le están subiendo imágenes en este momento. */
  readonly subiendoEtapa = signal<number | null>(null);
  /** Etapa cuyas imágenes se están mostrando desplegadas en la lista. */
  readonly etapaAbierta = signal<number | null>(null);

  /** Pestaña "Mapa": las imágenes del mapa de ubicación (multimedia de tipo MAPA) se gestionan aquí mismo. */
  readonly mapaActivo = signal(false);
  readonly imagenesMapa = signal<Multimedia[]>([]);
  readonly subiendoMapa = signal(false);

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
    const url: Record<Exclude<EscenaPunto, 'ZONAS'>, string | undefined> = {
      ENTORNO: u.recorrido360Url, AEREA: u.vistaAereaUrl, URBANISMO: u.urbanismoUrl
    };
    return ESCENAS_PUNTO
      .filter(e => e.id !== 'ZONAS' && clasificarMedio(url[e.id as Exclude<EscenaPunto, 'ZONAS'>]).tipo === 'imagen')
      .map(e => ({ ...e, url: url[e.id as Exclude<EscenaPunto, 'ZONAS'>]! }));
  });

  readonly esZonas = computed(() => this.escena() === 'ZONAS');

  readonly escenaActual = computed(() => {
    if (this.esZonas()) {
      const url = this.imagenZonas()?.url;
      return url ? { id: 'ZONAS' as EscenaPunto, titulo: 'Zonas destacadas', url } : null;
    }
    return this.escenas().find(e => e.id === this.escena()) ?? null;
  });
  readonly esPlano = computed(() => this.escena() != null && esPuntoDePlano({ escena: this.escena()! }));

  readonly puntosDeEscena = computed(() => this.puntos().filter(p => p.escena === this.escena()
    && (this.esPlano() || esLugarCercano(p) === this.esLugar())));
  readonly hayPendiente = computed(() => this.esPlano() ? this.pendientePlano() != null : this.pendiente360() != null);

  /** Zonas que todavía no tienen botón en las zonas destacadas. */
  readonly zonasLibres = computed(() => {
    const usadas = new Set(this.puntosDeEscena().map(p => p.zonaComunId));
    return this.zonas().filter(z => z.id != null && !usadas.has(z.id));
  });

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
      next: lista => {
        this.panoramas.set(new Map(
          lista.filter(m => m.tipo === 'PANORAMICA_360' && m.loteId != null && m.activo).map(m => [m.loteId!, m])));
        const porEtapa = new Map<number, Multimedia[]>();
        lista.filter(m => m.etapaId != null && m.activo !== false && (m.tipo === 'IMAGEN' || m.tipo === 'PLANO'))
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0))
          .forEach(m => porEtapa.set(m.etapaId!, [...(porEtapa.get(m.etapaId!) ?? []), m]));
        this.imagenesEtapa.set(porEtapa);
        this.panoramasEtapa.set(new Map(
          lista.filter(m => m.tipo === 'PANORAMICA_360' && m.etapaId != null && m.activo !== false).map(m => [m.etapaId!, m])));
        this.panoramasZona.set(new Map(
          lista.filter(m => m.tipo === 'PANORAMICA_360' && m.zonaComunId != null && m.activo).map(m => [m.zonaComunId!, m])));
      },
      error: () => undefined
    });
    this.multimediaService.listarPorEntidad('proyecto', proyectoId).subscribe({
      next: lista => {
        this.imagenZonas.set(lista
          .filter(m => m.tipo === 'ZONAS_DESTACADAS' && m.activo !== false)
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0] ?? null);
        this.imagenesMapa.set(
          lista.filter(m => m.tipo === 'MAPA' && m.activo !== false)
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0)));
      },
      error: () => undefined
    });
    this.zonaService.listarPorProyecto(proyectoId).subscribe({
      next: lista => this.zonas.set(lista.filter(z => z.activo !== false)),
      error: () => undefined
    });
    this.etapaService.listarPorProyecto(proyectoId).subscribe({
      next: lista => this.etapas.set(lista),
      error: () => undefined
    });
  }

  elegirEscena(escena: EscenaPunto): void {
    this.mapaActivo.set(false);
    this.escena.set(escena);
    this.limpiarFormulario();
  }

  /** Abre la pestaña de zonas destacadas: botones sobre la imagen de fondo, uno por zona común. */
  elegirZonas(): void {
    this.limpiarFormulario();
    this.mapaActivo.set(false);
    this.escena.set('ZONAS');
  }

  /** Al elegir una zona, el texto del botón se rellena con su nombre (se puede cambiar). */
  elegirZona(id: number | null): void {
    this.zonaId.set(id);
    const zona = this.zonas().find(z => z.id === id);
    if (zona) this.etiqueta.set(zona.nombre);
  }

  /** Sube (o reemplaza) la imagen de fondo de las zonas destacadas; queda en multimedia con tipo ZONAS_DESTACADAS. */
  async subirImagenZonas(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || this.subiendoImagenZonas()) return;

    const problema = validarArchivo(archivo, ['imagen']);
    if (problema) {
      this.toast.showError(problema);
      return;
    }

    this.subiendoImagenZonas.set(true);
    try {
      const resultado = await lastValueFrom(this.cloudinary.subirArchivo(archivo));
      const anterior = this.imagenZonas();
      const creado = await lastValueFrom(this.multimediaService.crearMultimedia({
        proyectoId: this.ubicacion().proyectoId,
        tipo: 'ZONAS_DESTACADAS',
        titulo: 'Imagen de zonas destacadas',
        url: resultado.url,
        nombreArchivo: archivo.name,
        orden: 1,
        portada: false,
        publicado: true,
        activo: true
      }));
      this.imagenZonas.set(creado);
      this.toast.showSuccess('Imagen de las zonas destacadas guardada');
      if (anterior?.id != null) this.multimediaService.eliminarMultimedia(anterior.id).subscribe({ error: () => undefined });
    } catch (err) {
      console.error('Error al subir la imagen de zonas destacadas:', err);
      this.toast.showError('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      this.subiendoImagenZonas.set(false);
    }
  }

  tienePanoramaZona(punto: Punto360): boolean {
    return punto.zonaComunId != null && this.panoramasZona().has(punto.zonaComunId);
  }

  /** Sube la imagen 360° de la zona a la que apunta el botón y la deja en su multimedia (la reemplaza si ya tenía una). */
  async subirZona360(punto: Punto360, evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    const zonaId = punto.zonaComunId;
    if (!archivo || zonaId == null || this.subiendoZona() !== null) return;

    const problema = validarArchivo(archivo, ['imagen']);
    if (problema) {
      this.toast.showError(problema);
      return;
    }

    this.subiendoZona.set(zonaId);
    try {
      const resultado = await lastValueFrom(this.cloudinary.subirArchivo(archivo));
      const anterior = this.panoramasZona().get(zonaId);
      const creado = await lastValueFrom(this.multimediaService.crearMultimedia({
        zonaComunId: zonaId,
        tipo: 'PANORAMICA_360',
        titulo: `Imagen 360° de ${punto.zonaComunNombre ?? punto.etiqueta}`,
        url: resultado.url,
        nombreArchivo: archivo.name,
        orden: 1,
        portada: false,
        publicado: true,
        activo: true
      }));
      this.panoramasZona.update(mapa => new Map(mapa).set(zonaId, creado));
      this.toast.showSuccess('Imagen 360° de la zona guardada');
      if (anterior?.id != null) this.multimediaService.eliminarMultimedia(anterior.id).subscribe({ error: () => undefined });
    } catch (err) {
      console.error('Error al subir la imagen 360° de la zona:', err);
      this.toast.showError('No se pudo guardar la imagen 360° de la zona.');
    } finally {
      this.subiendoZona.set(null);
    }
  }

  elegirMapa(): void {
    this.limpiarFormulario();
    this.mapaActivo.set(true);
  }

  /** Sube una o varias imágenes del mapa; cada una queda guardada en multimedia (tipo MAPA) al final de la lista. */
  async subirMapa(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    if (archivos.length === 0 || this.subiendoMapa()) return;

    for (const archivo of archivos) {
      const problema = validarArchivo(archivo, ['imagen']);
      if (problema) {
        this.toast.showError(`${archivo.name}: ${problema}`);
        return;
      }
    }

    this.subiendoMapa.set(true);
    const proyectoId = this.ubicacion().proyectoId;
    let subidas = 0;
    try {
      for (const archivo of archivos) {
        const resultado = await lastValueFrom(this.cloudinary.subirArchivo(archivo));
        const orden = Math.max(0, ...this.imagenesMapa().map(m => m.orden ?? 0)) + 1;
        const creado = await lastValueFrom(this.multimediaService.crearMultimedia({
          proyectoId,
          tipo: 'MAPA',
          titulo: `Mapa ${orden}`,
          url: resultado.url,
          nombreArchivo: archivo.name,
          orden,
          portada: false,
          publicado: true,
          activo: true
        }));
        this.imagenesMapa.update(lista => [...lista, creado]);
        subidas++;
      }
      this.toast.showSuccess(subidas === 1 ? 'Imagen del mapa guardada' : `${subidas} imágenes del mapa guardadas`);
    } catch (err) {
      console.error('Error al subir la imagen del mapa:', err);
      this.toast.showError('No se pudo subir la imagen del mapa. Inténtalo de nuevo.');
    } finally {
      this.subiendoMapa.set(false);
    }
  }

  /** Sube o baja una imagen en el carrusel intercambiando su número de orden con la vecina. */
  async moverMapa(imagen: Multimedia, delta: -1 | 1): Promise<void> {
    const lista = [...this.imagenesMapa()];
    const i = lista.findIndex(m => m.id === imagen.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return;

    // Los números de orden pueden repetirse: se reasignan 1..n según el orden que se ve
    [lista[i], lista[j]] = [lista[j], lista[i]];
    const reordenada = lista.map((m, k) => ({ ...m, orden: k + 1 }));
    const anterior = this.imagenesMapa();
    const cambiadas = reordenada.filter(m => anterior.find(x => x.id === m.id)?.orden !== m.orden);
    this.imagenesMapa.set(reordenada);

    try {
      await Promise.all(cambiadas.map(m => lastValueFrom(this.multimediaService.actualizarMultimedia(m.id!, m))));
    } catch (err) {
      console.error('Error al reordenar las imágenes del mapa:', err);
      this.imagenesMapa.set(anterior);
      this.toast.showError('No se pudo cambiar el orden. Inténtalo de nuevo.');
    }
  }

  async quitarMapa(imagen: Multimedia): Promise<void> {
    if (imagen.id == null) return;
    const ok = await this.confirm.open({
      title: 'Quitar imagen del mapa',
      message: `¿Quitar "${imagen.titulo || 'esta imagen'}" del mapa? También se elimina de Multimedia.`,
      confirmText: 'Sí, quitar',
      type: 'danger'
    });
    if (!ok) return;

    this.multimediaService.eliminarMultimedia(imagen.id).subscribe({
      next: () => this.imagenesMapa.update(lista => lista.filter(m => m.id !== imagen.id)),
      error: () => this.toast.showError('No se pudo quitar la imagen.')
    });
  }

  /** Imágenes de la etapa a la que apunta el botón. */
  imagenesDe(punto: Punto360): Multimedia[] {
    return punto.etapaId != null ? (this.imagenesEtapa().get(punto.etapaId) ?? []) : [];
  }

  /** Sube una o varias imágenes de la etapa; cada una queda en Multimedia asociada a la etapa y se ve en la tarjeta pública. */
  async subirEtapa(punto: Punto360, evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    const etapaId = punto.etapaId;
    if (archivos.length === 0 || etapaId == null || this.subiendoEtapa() !== null) return;

    for (const archivo of archivos) {
      const problema = validarArchivo(archivo, ['imagen']);
      if (problema) {
        this.toast.showError(`${archivo.name}: ${problema}`);
        return;
      }
    }

    this.subiendoEtapa.set(etapaId);
    let subidas = 0;
    try {
      for (const archivo of archivos) {
        const resultado = await lastValueFrom(this.cloudinary.subirArchivo(archivo));
        const orden = Math.max(0, ...(this.imagenesEtapa().get(etapaId) ?? []).map(m => m.orden ?? 0)) + 1;
        const creado = await lastValueFrom(this.multimediaService.crearMultimedia({
          etapaId,
          tipo: 'IMAGEN',
          titulo: `${punto.etiqueta} ${orden}`,
          url: resultado.url,
          nombreArchivo: archivo.name,
          orden,
          portada: false,
          publicado: true,
          activo: true
        }));
        this.imagenesEtapa.update(mapa => new Map(mapa).set(etapaId, [...(mapa.get(etapaId) ?? []), creado]));
        subidas++;
      }
      this.etapaAbierta.set(etapaId);
      this.toast.showSuccess(subidas === 1 ? 'Imagen de la etapa guardada' : `${subidas} imágenes de la etapa guardadas`);
    } catch (err) {
      console.error('Error al subir la imagen de la etapa:', err);
      this.toast.showError('No se pudo subir la imagen de la etapa. Inténtalo de nuevo.');
    } finally {
      this.subiendoEtapa.set(null);
    }
  }

  tienePanoramaEtapa(punto: Punto360): boolean {
    return punto.etapaId != null && this.panoramasEtapa().has(punto.etapaId);
  }

  /** Sube la imagen 360° de la etapa y la deja en su multimedia (reemplaza la anterior si ya tenía una). */
  async subirEtapa360(punto: Punto360, evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    const etapaId = punto.etapaId;
    if (!archivo || etapaId == null || this.subiendoEtapa() !== null) return;

    const problema = validarArchivo(archivo, ['imagen']);
    if (problema) {
      this.toast.showError(problema);
      return;
    }

    this.subiendoEtapa.set(etapaId);
    try {
      const resultado = await lastValueFrom(this.cloudinary.subirArchivo(archivo));
      const anterior = this.panoramasEtapa().get(etapaId);
      const creado = await lastValueFrom(this.multimediaService.crearMultimedia({
        etapaId,
        tipo: 'PANORAMICA_360',
        titulo: `Imagen 360° de ${punto.etapaNombre ?? punto.etiqueta}`,
        url: resultado.url,
        nombreArchivo: archivo.name,
        orden: 1,
        portada: false,
        publicado: true,
        activo: true
      }));
      this.panoramasEtapa.update(mapa => new Map(mapa).set(etapaId, creado));
      this.toast.showSuccess('Imagen 360° de la etapa guardada');
      if (anterior?.id != null) this.multimediaService.eliminarMultimedia(anterior.id).subscribe({ error: () => undefined });
    } catch (err) {
      console.error('Error al subir la imagen 360° de la etapa:', err);
      this.toast.showError('No se pudo guardar la imagen 360° de la etapa.');
    } finally {
      this.subiendoEtapa.set(null);
    }
  }

  async quitarImagenEtapa(imagen: Multimedia): Promise<void> {
    if (imagen.id == null || imagen.etapaId == null) return;
    const ok = await this.confirm.open({
      title: 'Quitar imagen de la etapa',
      message: `¿Quitar "${imagen.titulo || 'esta imagen'}"? También se elimina de Multimedia.`,
      confirmText: 'Sí, quitar',
      type: 'danger'
    });
    if (!ok) return;

    const etapaId = imagen.etapaId;
    this.multimediaService.eliminarMultimedia(imagen.id).subscribe({
      next: () => this.imagenesEtapa.update(mapa =>
        new Map(mapa).set(etapaId, (mapa.get(etapaId) ?? []).filter(m => m.id !== imagen.id))),
      error: () => this.toast.showError('No se pudo quitar la imagen.')
    });
  }

  alternarEtapa(punto: Punto360): void {
    this.etapaAbierta.update(actual => (actual === punto.etapaId ? null : punto.etapaId ?? null));
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
    const tieneDestino = this.esZonas()
      ? this.zonaId() != null
      : this.esPlano() ? this.etapaId() != null : (this.esLugar() || this.loteId() != null);
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
      etapaId: this.esPlano() && !this.esZonas() ? this.etapaId() : null,
      zonaComunId: this.esZonas() ? this.zonaId() : null
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
    this.zonaId.set(null);
    this.etiqueta.set('');
  }
}
