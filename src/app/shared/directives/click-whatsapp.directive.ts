import { Directive, HostListener, inject, input } from '@angular/core';
import { AnaliticaService } from '../../core/services/analitica.service';

/**
 * Marca un enlace o botón de WhatsApp para contar el clic en la analítica.
 * Uso: <a appClickWhatsapp [proyectoId]="proyecto.id" ...>. Sin proyectoId se toma el de la página (si es de un proyecto).
 */
@Directive({ selector: '[appClickWhatsapp]', standalone: true })
export class ClickWhatsappDirective {
  private analitica = inject(AnaliticaService);
  readonly proyectoId = input<number | null | undefined>(undefined);

  @HostListener('click')
  alHacerClic(): void {
    this.analitica.clickWhatsapp(this.proyectoId());
  }
}
