import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, inject, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { CarruselLaminasComponent, Lamina } from '../carrusel-laminas/carrusel-laminas.component';
import { clasificarMedio } from '../../../../../core/utils/medios';
import { enlaceWhatsapp, mensajeConsultaVilla } from '../../../../../core/utils/whatsapp';
import { environment } from '../../../../../../environments/environment';
import { IdiomaService } from '../../../../../core/services/idioma.service';

@Component({
  selector: 'app-casa-modelo-publico',
  standalone: true,
  imports: [TranslocoPipe, MedioComponent, CarruselLaminasComponent],
  templateUrl: './casa-modelo.component.html',
  styleUrl: './casa-modelo.component.scss'
})
export class CasaModeloPublicoComponent {
  private seccion = inicializarSeccion('casa-modelo');
  private idioma = inject(IdiomaService);

  readonly vista = this.seccion.vista;
  readonly casas = computed(() => this.seccion.detalle()?.casasModelo ?? []);

  /** Cuando el proyecto tiene varias casas modelo se elige cuál ver. */
  readonly seleccionada = signal(0);
  readonly casa = computed(() => this.casas()[this.seleccionada()] ?? this.casas()[0] ?? null);

  /** WhatsApp con el mensaje ya escrito sobre la tipología que se está viendo. */
  readonly whatsappUrl = computed(() => {
    const casa = this.casa();
    const proyecto = this.seccion.detalle()?.proyecto.nombre ?? this.idioma.t('proyecto.tipologias.elProyecto');
    return casa ? enlaceWhatsapp(environment.contacto.whatsapp, mensajeConsultaVilla(casa, proyecto, this.idioma.idioma())) : '';
  });

  private archivosDeLaCasa(tipo: 'IMAGEN' | 'PLANO') {
    const id = this.casa()?.id;
    return (this.seccion.detalle()?.multimediaCasas ?? [])
      .filter(m => m.casaModeloId === id && m.tipo === tipo)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.id ?? 0) - (b.id ?? 0));
  }

  /** Imágenes (renders) de la tipología elegida. */
  readonly imagenes = computed<Lamina[]>(() =>
    this.archivosDeLaCasa('IMAGEN').map(m => ({ id: m.id, url: m.url, titulo: m.titulo })));

  /** Planos en imagen de la tipología (más el enlace de plano antiguo si es una imagen). */
  readonly planosImagen = computed<Lamina[]>(() => {
    const subidos = this.archivosDeLaCasa('PLANO')
      .filter(m => clasificarMedio(m.url).tipo === 'imagen')
      .map(m => ({ id: m.id, url: m.url, titulo: m.titulo }));
    const antiguo = this.casa()?.planoUrl;
    return antiguo && clasificarMedio(antiguo).tipo === 'imagen' ? [{ url: antiguo, titulo: this.idioma.t('proyecto.tipologias.plano') }, ...subidos] : subidos;
  });

  /** Planos que no son imagen (PDF u otros): se ofrecen como enlace. */
  readonly planosDocumento = computed(() => {
    const subidos = this.archivosDeLaCasa('PLANO')
      .filter(m => clasificarMedio(m.url).tipo !== 'imagen')
      .map(m => ({ url: m.url, titulo: m.titulo || this.idioma.t('proyecto.tipologias.plano') }));
    const antiguo = this.casa()?.planoUrl;
    return antiguo && clasificarMedio(antiguo).tipo !== 'imagen' ? [{ url: antiguo, titulo: this.idioma.t('proyecto.tipologias.plano') }, ...subidos] : subidos;
  });
}
