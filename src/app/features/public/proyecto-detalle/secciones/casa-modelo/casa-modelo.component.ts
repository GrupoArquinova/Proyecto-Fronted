import { Component, computed, signal } from '@angular/core';
import { inicializarSeccion } from '../seccion.utils';
import { MedioComponent } from '../medio/medio.component';
import { CarruselLaminasComponent, Lamina } from '../carrusel-laminas/carrusel-laminas.component';
import { clasificarMedio } from '../../../../../core/utils/medios';

@Component({
  selector: 'app-casa-modelo-publico',
  standalone: true,
  imports: [MedioComponent, CarruselLaminasComponent],
  templateUrl: './casa-modelo.component.html',
  styleUrl: './casa-modelo.component.scss'
})
export class CasaModeloPublicoComponent {
  private seccion = inicializarSeccion('casa-modelo');

  readonly vista = this.seccion.vista;
  readonly casas = computed(() => this.seccion.detalle()?.casasModelo ?? []);

  /** Cuando el proyecto tiene varias casas modelo se elige cuál ver. */
  readonly seleccionada = signal(0);
  readonly casa = computed(() => this.casas()[this.seleccionada()] ?? this.casas()[0] ?? null);

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
    return antiguo && clasificarMedio(antiguo).tipo === 'imagen' ? [{ url: antiguo, titulo: 'Plano' }, ...subidos] : subidos;
  });

  /** Planos que no son imagen (PDF u otros): se ofrecen como enlace. */
  readonly planosDocumento = computed(() => {
    const subidos = this.archivosDeLaCasa('PLANO')
      .filter(m => clasificarMedio(m.url).tipo !== 'imagen')
      .map(m => ({ url: m.url, titulo: m.titulo || 'Plano' }));
    const antiguo = this.casa()?.planoUrl;
    return antiguo && clasificarMedio(antiguo).tipo !== 'imagen' ? [{ url: antiguo, titulo: 'Plano' }, ...subidos] : subidos;
  });
}
