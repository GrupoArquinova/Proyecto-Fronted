import { FilaLote, filaValida, filasConCodigoRepetido, generarFilas, proximoNumero } from './lotes-masivos';

const base = { etapaId: 1, prefijo: 'LT-', desde: 1, cantidad: 3, areaM2: 800, estadoId: 1 };
const fila = (clave: number, codigo: string, etapaId = 1): FilaLote =>
  ({ clave, etapaId, codigo, areaM2: 800, estadoId: 1 });

describe('generarFilas', () => {
  it('genera codigos consecutivos con ceros a la izquierda', () => {
    const filas = generarFilas(base, 10);
    expect(filas.map(f => f.codigo)).toEqual(['LT-01', 'LT-02', 'LT-03']);
    expect(filas.map(f => f.clave)).toEqual([10, 11, 12]);
    expect(filas[0]).toMatchObject({ etapaId: 1, areaM2: 800, estadoId: 1 });
  });

  it('amplia el ancho cuando pasa de dos digitos', () => {
    const filas = generarFilas({ ...base, desde: 98, cantidad: 4 }, 1);
    expect(filas.map(f => f.codigo)).toEqual(['LT-098', 'LT-099', 'LT-100', 'LT-101']);
  });

  it('limita la cantidad por tanda y no genera filas negativas', () => {
    expect(generarFilas({ ...base, cantidad: 5000 }, 1).length).toBe(200);
    expect(generarFilas({ ...base, cantidad: -3 }, 1)).toEqual([]);
  });
});

describe('proximoNumero', () => {
  const existentes = [
    { etapaId: 1, codigo: 'LT-01' }, { etapaId: 1, codigo: 'LT-10' },
    { etapaId: 1, codigo: 'MZ-30' }, { etapaId: 2, codigo: 'LT-50' }
  ];

  it('sigue despues del mayor numero del mismo prefijo y etapa', () => {
    expect(proximoNumero(existentes, 1, 'LT-')).toBe(11);
    expect(proximoNumero(existentes, 2, 'LT-')).toBe(51);
  });

  it('empieza en 1 si no hay codigos con ese prefijo', () => {
    expect(proximoNumero(existentes, 1, 'CASA-')).toBe(1);
  });

  it('trata los caracteres especiales del prefijo como texto', () => {
    expect(proximoNumero([{ etapaId: 1, codigo: 'A.1' }], 1, 'A.')).toBe(2);
    expect(proximoNumero([{ etapaId: 1, codigo: 'AX1' }], 1, 'A.')).toBe(1);
  });
});

describe('filasConCodigoRepetido', () => {
  it('marca las filas cuyo codigo ya existe en esa etapa', () => {
    const repetidas = filasConCodigoRepetido([fila(1, 'lt-01'), fila(2, 'LT-02')], [{ etapaId: 1, codigo: 'LT-01' }]);
    expect([...repetidas]).toEqual([1]);
  });

  it('marca ambas filas cuando se repiten entre si', () => {
    const repetidas = filasConCodigoRepetido([fila(1, 'LT-05'), fila(2, 'LT-06'), fila(3, ' lt-05 ')], []);
    expect([...repetidas].sort()).toEqual([1, 3]);
  });

  it('el mismo codigo en otra etapa no es repetido', () => {
    expect(filasConCodigoRepetido([fila(1, 'LT-01', 2)], [{ etapaId: 1, codigo: 'LT-01' }]).size).toBe(0);
  });
});

describe('filaValida', () => {
  it('exige codigo, area mayor que cero y etapa', () => {
    expect(filaValida(fila(1, 'LT-01'))).toBe(true);
    expect(filaValida({ ...fila(1, '  '), areaM2: 800 })).toBe(false);
    expect(filaValida({ ...fila(1, 'LT-01'), areaM2: 0 })).toBe(false);
    expect(filaValida({ ...fila(1, 'LT-01'), areaM2: null })).toBe(false);
    expect(filaValida({ ...fila(1, 'LT-01'), etapaId: 0 })).toBe(false);
  });
});
