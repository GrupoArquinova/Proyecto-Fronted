/** Enlace de WhatsApp con el mensaje ya escrito. No se envía nada hasta que la persona pulse "enviar" en WhatsApp. */
export function enlaceWhatsapp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export interface DatosVilla {
  nombre: string;
  areaConstruidaM2?: number | null;
  numeroHabitaciones?: number | null;
  numeroBanos?: number | null;
}

/** Mensaje para consultar por una tipología de un proyecto, con los datos de la ficha que estén cargados. */
export function mensajeConsultaVilla(villa: DatosVilla, proyecto: string, idioma: string = 'es'): string {
  const ingles = idioma === 'en';
  const datos: string[] = [];
  if (villa.areaConstruidaM2) datos.push(`${villa.areaConstruidaM2} m²`);
  if (villa.numeroHabitaciones) {
    const palabra = ingles ? (villa.numeroHabitaciones === 1 ? 'bedroom' : 'bedrooms') : (villa.numeroHabitaciones === 1 ? 'habitación' : 'habitaciones');
    datos.push(`${villa.numeroHabitaciones} ${palabra}`);
  }
  if (villa.numeroBanos) {
    const palabra = ingles ? (villa.numeroBanos === 1 ? 'bathroom' : 'bathrooms') : (villa.numeroBanos === 1 ? 'baño' : 'baños');
    datos.push(`${villa.numeroBanos} ${palabra}`);
  }

  const ficha = datos.length > 0 ? ` (${datos.join(', ')})` : '';
  return ingles
    ? `Hello, I am interested in the ${villa.nombre} house type at ${proyecto}${ficha}. Could you give me more information about this villa?`
    : `Hola, estoy interesado en la tipología ${villa.nombre} de ${proyecto}${ficha}. ¿Me pueden dar más información sobre esta villa?`;
}
