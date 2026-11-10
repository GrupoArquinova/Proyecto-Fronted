import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Metricas, PeriodoMetricas } from '../../../core/models/metricas.models';
import { AuthService } from '../../../core/services/auth.service';
import { MetricasService } from '../../../core/services/metricas.service';
import { completarDias, errorDeRango, fechaCorta, fechaHoraLocal, fechaIso, humanizar, porcentaje, ultimosDias } from '../../../core/utils/metricas';
import { BarrasApiladasComponent, FilaApilada } from './graficos/barras-apiladas.component';
import { BarrasHorizontalesComponent } from './graficos/barras-horizontales.component';
import { GraficoSerieComponent } from './graficos/grafico-serie.component';

type Estado = 'cargando' | 'listo' | 'error';
type Seleccion = 7 | 30 | 90 | 'rango';

const COLORES_ESTADO_LOTE: Record<string, string> = { disponibles: '#2c5953', reservados: '#d99a2b', vendidos: '#64748b' };

// Sin OnPush a propósito (decisión del panel de administración): el resto de pantallas del panel tampoco lo usan.
@Component({
  selector: 'app-metricas',
  standalone: true,
  imports: [FormsModule, BarrasHorizontalesComponent, BarrasApiladasComponent, GraficoSerieComponent],
  templateUrl: './metricas.component.html',
  styleUrl: './metricas.component.scss'
})
export class MetricasComponent implements OnInit {
  private servicio = inject(MetricasService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private peticion?: Subscription;

  readonly opciones: { valor: Seleccion; etiqueta: string }[] = [
    { valor: 7, etiqueta: '7 días' },
    { valor: 30, etiqueta: '30 días' },
    { valor: 90, etiqueta: '90 días' },
    { valor: 'rango', etiqueta: 'Personalizado' }
  ];
  readonly seleccion = signal<Seleccion>(30);
  desdePersonal = '';
  hastaPersonal = '';
  readonly errorRango = signal('');
  /** Las fechas de hoy, para que el calendario no deje elegir el futuro. */
  readonly hoy = fechaIso(new Date());

  readonly estado = signal<Estado>('cargando');
  readonly datos = signal<Metricas | null>(null);
  readonly periodo = signal<PeriodoMetricas>(ultimosDias(30));

  /** Las preguntas recientes del chat (texto de personas) solo las ve el administrador. */
  readonly esAdministrador = this.auth.tieneRol('ADMINISTRADOR');

  readonly tarjetas = computed(() => {
    const d = this.datos();
    if (!d) return [];
    const e = d.analitica.embudo;
    return [
      { id: 'solicitudes', etiqueta: 'Solicitudes', valor: d.solicitudes.total },
      { id: 'visitas', etiqueta: 'Visitas a proyectos', valor: e.vistasProyecto },
      { id: 'whatsapp', etiqueta: 'Clics en WhatsApp', valor: e.clicksWhatsapp },
      { id: 'formularios', etiqueta: 'Formularios enviados', valor: e.formulariosEnviados },
      { id: 'descargas', etiqueta: 'Descargas de brochure', valor: e.descargasBrochure }
    ];
  });

  readonly solicitudesPorSemana = computed(() =>
    (this.datos()?.solicitudes.porSemana ?? []).map(s => ({
      etiqueta: fechaCorta(s.inicio),
      valor: s.total,
      detalle: `Semana del ${fechaCorta(s.inicio)}`
    }))
  );

  readonly solicitudesPorProyecto = computed(() =>
    (this.datos()?.solicitudes.porProyecto ?? []).map(p => ({ etiqueta: p.proyecto, valor: p.total }))
  );

  readonly lotesPorProyecto = computed<FilaApilada[]>(() =>
    (this.datos()?.lotes.porProyecto ?? []).map(p => ({
      etiqueta: p.proyecto,
      segmentos: [
        { nombre: 'Disponibles', valor: p.disponibles, color: COLORES_ESTADO_LOTE['disponibles'] },
        { nombre: 'Reservados', valor: p.reservados, color: COLORES_ESTADO_LOTE['reservados'] },
        { nombre: 'Vendidos', valor: p.vendidos, color: COLORES_ESTADO_LOTE['vendidos'] }
      ]
    }))
  );

  readonly visitasPorProyecto = computed(() =>
    (this.datos()?.analitica.visitasPorProyecto ?? []).map(p => ({ etiqueta: p.proyecto, valor: p.vistas }))
  );

  readonly embudo = computed(() => {
    const e = this.datos()?.analitica.embudo;
    if (!e) return [];
    return [
      { etiqueta: 'Vistas de proyecto', valor: e.vistasProyecto },
      { etiqueta: 'Clics en WhatsApp', valor: e.clicksWhatsapp },
      { etiqueta: 'Formularios enviados', valor: e.formulariosEnviados },
      { etiqueta: 'Descargas de brochure', valor: e.descargasBrochure }
    ];
  });
  readonly baseEmbudo = computed(() => this.datos()?.analitica.embudo.vistasProyecto ?? 0);

  readonly visitasPorDia = computed(() => {
    const d = this.datos();
    if (!d) return [];
    const p = this.periodo();
    return completarDias(d.analitica.visitasPorDia, d.periodo.desde || p.desde, d.periodo.hasta || p.hasta).map(x => ({
      etiqueta: fechaCorta(x.fecha),
      valor: x.total,
      detalle: fechaCorta(x.fecha)
    }));
  });

  readonly temas = computed(() => (this.datos()?.chat.temas ?? []).map(t => ({ etiqueta: humanizar(t.tema), valor: t.total })));

  readonly recientes = computed(() =>
    (this.datos()?.chat.recientes ?? []).map(r => ({ fecha: fechaHoraLocal(r.fecha), pregunta: r.pregunta, tema: humanizar(r.tema) }))
  );

  readonly textoPeriodo = computed(() => {
    const p = this.datos()?.periodo.desde ? this.datos()!.periodo : this.periodo();
    return `${fechaCorta(p.desde)} – ${fechaCorta(p.hasta)}`;
  });

  readonly porcentajeConversion = computed(() => {
    const e = this.datos()?.analitica.embudo;
    return e ? porcentaje(e.formulariosEnviados, e.vistasProyecto) : 0;
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.peticion?.unsubscribe());
    if (this.enNavegador) this.cargar(this.periodo());
    else this.estado.set('cargando');
  }

  elegir(valor: Seleccion): void {
    this.seleccion.set(valor);
    this.errorRango.set('');
    if (valor === 'rango') {
      // Arranca con el período ya mostrado para no dejar los campos vacíos
      if (!this.desdePersonal) this.desdePersonal = this.periodo().desde;
      if (!this.hastaPersonal) this.hastaPersonal = this.periodo().hasta;
      return;
    }
    this.cargar(ultimosDias(valor));
  }

  aplicarRango(): void {
    const error = errorDeRango(this.desdePersonal, this.hastaPersonal);
    this.errorRango.set(error ?? '');
    if (!error) this.cargar({ desde: this.desdePersonal, hasta: this.hastaPersonal });
  }

  reintentar(): void {
    this.cargar(this.periodo());
  }

  private cargar(periodo: PeriodoMetricas): void {
    this.periodo.set(periodo);
    this.estado.set('cargando');
    this.peticion?.unsubscribe(); // si se cambia de período mientras carga, solo vale la última respuesta
    this.peticion = this.servicio.obtener(periodo).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.estado.set('listo');
      },
      error: () => this.estado.set('error')
    });
  }
}
