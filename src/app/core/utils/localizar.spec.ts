import { describe, it, expect } from 'vitest';
import { ProyectoDetalle } from '../models/proyecto-detalle.models';
import { elegirTexto, localizarDetalle, nombreEtapa } from './localizar';

const detalle = (): ProyectoDetalle => ({
  proyecto: { id: 6, empresaId: 1, nombre: 'El Encanto', descripcion: 'Hola', descripcionEn: 'Hello', participacion: 'Diseño', participacionEn: null },
  ubicacion: { proyectoId: 6, referencias: 'Armenia 30 min', referenciasEn: 'Armenia 30 min (EN)' } as never,
  zonasComunes: [
    { id: 1, proyectoId: 6, nombre: 'Portería', nombreEn: 'Gatehouse', descripcion: 'Acceso', descripcionEn: 'Access' },
    { id: 2, proyectoId: 6, nombre: 'Caballeriza', descripcion: 'Caballos' }
  ] as never,
  casasModelo: [{ id: 1, proyectoId: 6, nombre: 'Villa Samán', descripcion: 'Dos plantas', descripcionEn: 'Two storeys' }] as never,
  lotes: [{ id: 1, codigo: 'L1', areaM2: 800, descripcion: 'Plano', etapaNombre: 'Etapa 01 - Rio Viejo', activo: true }] as never,
  multimedia: [],
  multimediaCasas: [],
  multimediaZonas: [],
  contenido: [{ empresaId: 1, seccion: 'MISION', titulo: 'Misión', tituloEn: 'Mission', contenido: 'Acompañar', contenidoEn: 'Support', publicado: true }],
  puntos: [{ proyectoId: 6, escena: 'URBANISMO', etiqueta: 'E.A', etapaId: 3, etapaNombre: 'Etapa A - Guayacán' }]
});

describe('elegirTexto', () => {
  it('en inglés usa el texto en inglés si existe', () => {
    expect(elegirTexto('en', 'Hola', 'Hello')).toBe('Hello');
  });
  it('en inglés sin texto en inglés (o en blanco) usa el español', () => {
    expect(elegirTexto('en', 'Hola', '')).toBe('Hola');
    expect(elegirTexto('en', 'Hola', '  ')).toBe('Hola');
    expect(elegirTexto('en', 'Hola', null)).toBe('Hola');
  });
  it('en español siempre usa el español', () => {
    expect(elegirTexto('es', 'Hola', 'Hello')).toBe('Hola');
  });
});

describe('nombreEtapa', () => {
  it('en español deja el nombre como está', () => {
    expect(nombreEtapa('Etapa 01 - Rio Viejo', 'es')).toBe('Etapa 01 - Rio Viejo');
  });
  it('en inglés cambia solo la palabra "Etapa" del comienzo', () => {
    expect(nombreEtapa('Etapa 01 - Rio Viejo', 'en')).toBe('Stage 01 - Rio Viejo');
    expect(nombreEtapa('etapa D', 'en')).toBe('Stage D');
  });
  it('no toca nombres que no empiezan por "Etapa"', () => {
    expect(nombreEtapa('Rio Viejo', 'en')).toBe('Rio Viejo');
    expect(nombreEtapa('Etapas del río', 'en')).toBe('Etapas del río');
  });
  it('si hay nombre en inglés lo usa', () => {
    expect(nombreEtapa('Etapa A', 'en', 'Phase A')).toBe('Phase A');
  });
});

describe('localizarDetalle', () => {
  it('en español devuelve exactamente los mismos datos', () => {
    const d = detalle();
    expect(localizarDetalle(d, 'es')).toBe(d);
  });

  it('sin datos devuelve null', () => {
    expect(localizarDetalle(null, 'en')).toBeNull();
  });

  it('en inglés pone los textos en inglés donde existen y deja el español donde no', () => {
    const r = localizarDetalle(detalle(), 'en')!;
    expect(r.proyecto.descripcion).toBe('Hello');
    expect(r.proyecto.participacion).toBe('Diseño');
    expect(r.ubicacion?.referencias).toBe('Armenia 30 min (EN)');
    expect(r.zonasComunes.map(z => z.nombre)).toEqual(['Gatehouse', 'Caballeriza']);
    expect(r.zonasComunes.map(z => z.descripcion)).toEqual(['Access', 'Caballos']);
    expect(r.casasModelo[0].descripcion).toBe('Two storeys');
    expect(r.contenido[0].titulo).toBe('Mission');
    expect(r.contenido[0].contenido).toBe('Support');
  });

  it('en inglés traduce el nombre de las etapas de los lotes y de los botones del plano', () => {
    const r = localizarDetalle(detalle(), 'en')!;
    expect(r.lotes[0].etapaNombre).toBe('Stage 01 - Rio Viejo');
    expect(r.puntos[0].etapaNombre).toBe('Stage A - Guayacán');
  });

  it('no modifica los datos originales', () => {
    const d = detalle();
    localizarDetalle(d, 'en');
    expect(d.proyecto.descripcion).toBe('Hola');
    expect(d.zonasComunes[0].nombre).toBe('Portería');
  });
});
