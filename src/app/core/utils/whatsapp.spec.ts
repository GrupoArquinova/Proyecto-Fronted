import { describe, it, expect } from 'vitest';
import { enlaceWhatsapp, mensajeConsultaVilla } from './whatsapp';

describe('whatsapp', () => {
  it('arma el enlace con el numero y el mensaje codificado', () => {
    const enlace = enlaceWhatsapp('573168653715', 'Hola, ¿qué tal?');
    expect(enlace.startsWith('https://wa.me/573168653715?text=')).toBe(true);
    expect(decodeURIComponent(enlace.split('?text=')[1])).toBe('Hola, ¿qué tal?');
  });

  it('el mensaje de una villa incluye su nombre, el proyecto y los datos de la ficha', () => {
    const mensaje = mensajeConsultaVilla(
      { nombre: 'Villa Samán', areaConstruidaM2: 293, numeroHabitaciones: 3, numeroBanos: 4 }, 'El Encanto');
    expect(mensaje).toBe('Hola, estoy interesado en la tipología Villa Samán de El Encanto (293 m², 3 habitaciones, 4 baños). '
      + '¿Me pueden dar más información sobre esta villa?');
  });

  it('usa el singular y omite los datos que no estan cargados', () => {
    expect(mensajeConsultaVilla({ nombre: 'Casa A', numeroHabitaciones: 1, numeroBanos: 1 }, 'Proyecto X'))
      .toContain('(1 habitación, 1 baño)');
    expect(mensajeConsultaVilla({ nombre: 'Casa A' }, 'Proyecto X'))
      .toBe('Hola, estoy interesado en la tipología Casa A de Proyecto X. ¿Me pueden dar más información sobre esta villa?');
  });
});
