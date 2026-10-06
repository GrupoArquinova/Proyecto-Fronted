import { computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ProyectoDetalleService } from '../../../../core/services/proyecto-detalle.service';
import { SeccionProyectoId } from '../../../../core/models/proyecto-detalle.models';

/**
 * Arranque común de cada sección del micrositio. Debe llamarse en el contexto de inyección
 * (inicializador de campo o constructor). Entrega:
 *  - detalle: todos los datos del proyecto
 *  - vista: la vista activa (query param `vista`), o la primera disponible si no hay una válida
 *    (con `primeraPorDefecto: false` queda en null: la sección muestra su vista principal, como la portada)
 * y devuelve a Bienvenida si la sección no tiene contenido (por ejemplo, URL escrita a mano).
 */
export function inicializarSeccion(id: SeccionProyectoId, opciones: { primeraPorDefecto?: boolean } = {}) {
  const primeraPorDefecto = opciones.primeraPorDefecto ?? true;
  const datos = inject(ProyectoDetalleService);
  const route = inject(ActivatedRoute);
  const router = inject(Router);

  const vistaSolicitada = toSignal(route.queryParamMap.pipe(map(p => p.get('vista'))), {
    initialValue: route.snapshot.queryParamMap.get('vista')
  });

  const subsecciones = computed(() => datos.secciones().find(s => s.id === id)?.subsecciones ?? []);

  const vista = computed(() => {
    const subs = subsecciones();
    const pedida = vistaSolicitada();
    return subs.some(s => s.id === pedida) ? pedida : (primeraPorDefecto ? (subs[0]?.id ?? null) : null);
  });

  effect(() => {
    const detalle = datos.detalle();
    if (detalle && !datos.secciones().some(s => s.id === id)) {
      router.navigate(['/proyectos', detalle.proyecto.id, 'bienvenida'], { replaceUrl: true });
    }
  });

  return { datos, detalle: datos.detalle, vista };
}
