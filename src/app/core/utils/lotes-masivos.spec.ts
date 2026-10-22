import { FilaLote, filaValida, filasConCodigoRepetido, generarFilas, proximoNumero, renumerarDesde } from './lotes-masivos';

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

describe('renumerarDesde', () => {
  const codigos = (filas: FilaLote[]) => filas.map(f => f.codigo);

  it('si la primera fila pasa a LT-100, las siguientes siguen LT-101, LT-102...', () => {
    const filas = [fila(1, 'LT-100'), fila(2, 'LT-02'), fila(3, 'LT-03')];
    expect(codigos(renumerarDesde(filas, 1))).toEqual(['LT-100', 'LT-101', 'LT-102']);
  });

  it('no toca las filas anteriores a la editada', () => {
    const filas = [fila(1, 'LT-01'), fila(2, 'LT-50'), fila(3, 'LT-03'), fila(4, 'LT-04')];
    expect(codigos(renumerarDesde(filas, 2))).toEqual(['LT-01', 'LT-50', 'LT-51', 'LT-52']);
  });

  it('conserva los ceros a la izquierda que escribio la persona', () => {
    const filas = [fila(1, 'LT-009'), fila(2, 'LT-002'), fila(3, 'LT-003')];
    expect(codigos(renumerarDesde(filas, 1))).toEqual(['LT-009', 'LT-010', 'LT-011']);
  });

  it('solo sigue las filas de la misma etapa y del mismo prefijo', () => {
    const filas = [fila(1, 'LT-100'), fila(2, 'LT-02'), fila(3, 'LT-01', 2), fila(4, 'MZ-07'), fila(5, 'LT-04')];
    expect(codigos(renumerarDesde(filas, 1))).toEqual(['LT-100', 'LT-101', 'LT-01', 'MZ-07', 'LT-102']);
  });

  it('si el codigo no termina en numero no cambia nada', () => {
    const filas = [fila(1, 'LOTE-ESQUINA'), fila(2, 'LT-02')];
    expect(renumerarDesde(filas, 1)).toBe(filas);
    expect(renumerarDesde(filas, 99)).toBe(filas);
  });

  it('quita el aviso de error de las filas renumeradas, que ya son otro codigo', () => {
    const filas = [fila(1, 'LT-100'), { ...fila(2, 'LT-02'), error: 'Ya existe un lote con ese código en la etapa.' }];
    expect(renumerarDesde(filas, 1)[1]).toMatchObject({ codigo: 'LT-101', error: undefined });
  });
});
