import { environment } from '../../../environments/environment';

/** Dirección del brochure en PDF de un proyecto (la genera el backend; sirve tanto para ofertas comerciales como de portafolio). */
export function urlBrochure(proyectoId: number): string {
  return `${environment.apiUrl}/proyectos/${proyectoId}/brochure.pdf`;
}

export interface DatosCompartir {
  titulo: string;
  texto: string;
  url: string;
}

/** Enlaces para compartir en cada red; todos son páginas que se abren en otra pestaña, sin cargar scripts de terceros. */
export function enlacesCompartir(d: DatosCompartir) {
  const u = encodeURIComponent(d.url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${d.texto} ${d.url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(d.texto)}&url=${u}`,
    correo: `mailto:?subject=${encodeURIComponent(d.titulo)}&body=${encodeURIComponent(`${d.texto}\n\n${d.url}`)}`
  };
}
