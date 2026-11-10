import { Lote } from '../models/lote.models';
import { estadoDeLote, formatoArea, formatoPrecio, ordenarLotes, posicionesEnPlano } from './lotes';

const lote = (extra: Partial<Lote> = {}): Lote =>
  ({ id: 1, codigo: 'L1', areaM2: 800, activo: true, estadoId: 1, ...extra });

describe('estadoDeLote', () => {
  it('reconoce los tres estados por nombre', () => {
    expect(estadoDeLote(lote({ estadoNombre: 'DISPONIBLE' })).clave).toBe('disponible');
    expect(estadoDeLote(lote({ estadoNombre: 'Reservado' })).clave).toBe('reservado');
    expect(estadoDeLote(lote({ estadoNombre: 'VENDIDO' })).clave).toBe('vendido');
  });

  it('usa el id 1 como disponible solo cuando no hay nombre', () => {
    expect(estadoDeLote(lote({ estadoId: 1, estadoNombre: undefined })).clave).toBe('disponible');
    expect(estadoDeLote(lote({ estadoId: 1, estadoNombre: 'VENDIDO' })).clave).toBe('vendido');
  });

  it('un estado desconocido no se disfraza de disponible', () => {
    const e = estadoDeLote(lote({ estadoId: 9, estadoNombre: 'EN TRAMITE' }));
    expect(e.clave).toBe('otro');
    expect(e.etiqueta).toBe('EN TRAMITE');
  });
});

describe('ordenarLotes', () => {
  it('ordena de forma natural y no modifica el arreglo original', () => {
    const original = [lote({ codigo: 'L10' }), lote({ codigo: 'M1' }), lote({ codigo: 'L2' })];
    expect(ordenarLotes(original).map(l => l.codigo)).toEqual(['L2', 'L10', 'M1']);
    expect(original.map(l => l.codigo)).toEqual(['L10', 'M1', 'L2']);
  });
});

describe('formatos', () => {
  it('da formato colombiano al area y al precio', () => {
    expect(formatoArea(800)).toBe('800 m²');
    expect(formatoArea(1100)).toContain('1.100');
    expect(formatoArea(null)).toBe('');
    expect(formatoPrecio(250000000)).toContain('250.000.000');
    expect(formatoPrecio(undefined)).toBe('');
  });
});

describe('posicionesEnPlano', () => {
  it('ignora los lotes sin posicion', () => {
    const mapa = posicionesEnPlano([lote({ id: 1 }), lote({ id: 2, posicionX: 10, posicionY: 20 })]);
    expect([...mapa.keys()]).toEqual([2]);
  });

  it('interpreta valores entre 0 y 1 como fracciones', () => {
    const mapa = posicionesEnPlano([lote({ id: 1, posicionX: 0.25, posicionY: 0.5 })]);
    expect(mapa.get(1)).toEqual({ x: 25, y: 50 });
  });

  it('interpreta valores mayores a 1 como porcentajes y los limita a 0-100', () => {
    const mapa = posicionesEnPlano([lote({ id: 1, posicionX: 30, posicionY: 140 })]);
    expect(mapa.get(1)).toEqual({ x: 30, y: 100 });
  });
});
