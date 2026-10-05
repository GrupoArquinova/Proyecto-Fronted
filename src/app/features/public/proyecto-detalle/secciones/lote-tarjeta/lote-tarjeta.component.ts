import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Lote } from '../../../../../core/models/lote.models';
import { estadoDeLote, formatoArea, formatoPrecio } from '../../../../../core/utils/lotes';

/** Ficha de un lote con su estado y el botón para pedir información (lleva el lote al formulario). */
@Component({
  selector: 'app-lote-tarjeta',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="tarjeta">
      <span class="etiqueta">Lote seleccionado</span>
      <h3>{{ lote().codigo }}</h3>
      @if (lote().nombre) { <p class="nombre">{{ lote().nombre }}</p> }

      <dl>
        <div><dt>Área</dt><dd>{{ area() }}</dd></div>
        <div><dt>Estado</dt><dd><span class="estado" [class]="estado().clave">{{ estado().etiqueta }}</span></dd></div>
        @if (precio()) { <div><dt>Precio</dt><dd>{{ precio() }}</dd></div> }
        @if (lote().etapaNombre) { <div><dt>Etapa</dt><dd>{{ lote().etapaNombre }}</dd></div> }
      </dl>

      @if (lote().descripcion) { <p class="texto">{{ lote().descripcion }}</p> }
      @if (lote().caracteristicas) { <p class="texto">{{ lote().caracteristicas }}</p> }

      @if (estado().clave !== 'vendido') {
        <a class="boton" [routerLink]="['/proyectos', proyectoId(), 'contacto']" [queryParams]="{ lote: lote().id }">
          Solicitar información
        </a>
      }
    </article>
  `,
  styles: [`
    :host { display: block; }
    .tarjeta {
      padding: 1.6rem 1.7rem;
      background: #ffffff;
      border: 1px solid rgba(44, 99, 96, 0.16);
      border-top: 5px solid #2c6360;
      border-radius: 18px;
      box-shadow: 0 14px 40px rgba(44, 99, 96, 0.18);
      color: #424242;
    }
    .etiqueta { color: #3c706e; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; }
    h3 { margin: 0.4rem 0 0.2rem; font-size: 2.3rem; font-weight: 800; color: #2c6360; line-height: 1.1; }
    .nombre { color: #6a6a6a; margin-bottom: 0.4rem; }
    dl { display: grid; gap: 0.2rem; margin: 1.1rem 0; }
    dl div { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid rgba(44, 99, 96, 0.1); }
    dt { color: #6a6a6a; font-size: 0.92rem; }
    dd { margin: 0; font-weight: 600; text-align: right; }
    .texto { color: #6a6a6a; line-height: 1.7; margin-bottom: 0.6rem; white-space: pre-line; }
    .estado { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; color: #ffffff; }
    .disponible { background: #2f9e63; }
    .reservado { background: #d9951a; }
    .vendido { background: #c94a4a; }
    .otro { background: #8a8a8a; }
    .boton {
      display: block; margin-top: 1.2rem; padding: 0.9rem; text-align: center;
      background: #2c6360; color: #ffffff; border-radius: 12px; font-weight: 700; text-decoration: none;
      box-shadow: 0 8px 20px rgba(44, 99, 96, 0.28); transition: background 0.2s, transform 0.2s;
    }
    .boton:hover { background: #3c706e; transform: translateY(-1px); }
  `]
})
export class LoteTarjetaComponent {
  readonly lote = input.required<Lote>();
  readonly proyectoId = input.required<number>();

  readonly estado = computed(() => estadoDeLote(this.lote()));
  readonly area = computed(() => formatoArea(this.lote().areaM2));
  readonly precio = computed(() => formatoPrecio(this.lote().precio));
}
