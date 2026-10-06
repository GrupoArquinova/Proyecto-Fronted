import { Component, HostListener, computed, input, signal } from '@angular/core';

export interface Lamina {
  id?: number;
  url: string;
  titulo?: string;
}

/**
 * Carrusel a pantalla completa (Bienvenida y Respaldo): la imagen llena la pantalla y el menú
 * flotante queda por encima. Se mueve con las flechas, con clic en la mitad izquierda o derecha de la
 * imagen, con las teclas ← →, deslizando el dedo o con la tira de miniaturas (que se puede ocultar).
 */
@Component({
  selector: 'app-carrusel-laminas',
  standalone: true,
  templateUrl: './carrusel-laminas.component.html',
  styleUrl: './carrusel-laminas.component.scss'
})
export class CarruselLaminasComponent {
  readonly laminas = input.required<Lamina[]>();
  /** Texto alternativo cuando la lámina no tiene título. */
  readonly alt = input('Imagen del proyecto');
  readonly etiqueta = input('Imágenes del proyecto');

  private indice = signal(0);
  /** Las miniaturas se pueden esconder para ver la imagen más grande. */
  readonly miniaturasVisibles = signal(true);

  readonly indiceActual = computed(() => Math.min(this.indice(), Math.max(0, this.laminas().length - 1)));
  readonly actual = computed(() => this.laminas()[this.indiceActual()] ?? null);

  irA(i: number): void {
    this.indice.set(i);
  }

  siguiente(): void {
    const total = this.laminas().length;
    if (total > 0) this.indice.set((this.indiceActual() + 1) % total);
  }

  anterior(): void {
    const total = this.laminas().length;
    if (total > 0) this.indice.set((this.indiceActual() - 1 + total) % total);
  }

  /** Clic en la mitad izquierda de la imagen retrocede y en la derecha avanza, sin usar las flechas. */
  clicEnImagen(evento: MouseEvent): void {
    if (this.laminas().length < 2) return;
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    if (evento.clientX - caja.left < caja.width / 2) this.anterior();
    else this.siguiente();
  }

  private toqueInicioX: number | null = null;

  inicioToque(evento: TouchEvent): void {
    this.toqueInicioX = evento.touches[0]?.clientX ?? null;
  }

  /** Deslizar el dedo hacia la izquierda avanza; hacia la derecha retrocede. */
  finToque(evento: TouchEvent): void {
    const inicio = this.toqueInicioX;
    this.toqueInicioX = null;
    const fin = evento.changedTouches[0]?.clientX;
    if (inicio == null || fin == null || this.laminas().length < 2) return;
    const dx = fin - inicio;
    if (Math.abs(dx) < 50) return;
    // Evita que el navegador además genere un clic que cambie otra vez de imagen
    evento.preventDefault();
    if (dx < 0) this.siguiente();
    else this.anterior();
  }

  @HostListener('document:keydown.arrowright')
  teclaDerecha(): void {
    this.siguiente();
  }

  @HostListener('document:keydown.arrowleft')
  teclaIzquierda(): void {
    this.anterior();
  }
}
