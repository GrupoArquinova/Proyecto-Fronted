import { describe, it, expect } from 'vitest';
import { ContenidoInstitucional } from '../../../core/models/contenido.models';
import { bloquesDeIdentidad } from './identidad';

const seccion = (clave: string, contenido: string, publicado = true): ContenidoInstitucional =>
  ({ empresaId: 1, seccion: clave, titulo: `${clave} propuesta`, contenido, publicado });

describe('bloquesDeIdentidad', () => {
  it('muestra mision, vision y valores en ese orden, con nombres fijos (no el titulo del panel)', () => {
    const bloques = bloquesDeIdentidad([seccion('VALORES', 'v'), seccion('MISION', 'm'), seccion('VISION', 'x')]);
    expect(bloques.map(b => b.etiqueta)).toEqual(['Misión', 'Visión', 'Valores']);
    expect(bloques.map(b => b.contenido)).toEqual(['m', 'x', 'v']);
  });

  it('no muestra lo que no esta publicado', () => {
    const bloques = bloquesDeIdentidad([seccion('MISION', 'm'), seccion('VISION', 'x', false)]);
    expect(bloques.map(b => b.etiqueta)).toEqual(['Misión']);
  });

  it('ignora los textos que no son de identidad, como IDENTIDAD o BENEFICIOS', () => {
    expect(bloquesDeIdentidad([seccion('IDENTIDAD', 'manual de marca'), seccion('BENEFICIOS', 'b')])).toEqual([]);
  });

  it('no muestra un bloque vacio ni distingue mayusculas en la clave', () => {
    const bloques = bloquesDeIdentidad([seccion('mision', '  Acompañar proyectos  '), seccion('VISION', '   ')]);
    expect(bloques).toEqual([{ seccion: 'MISION', etiqueta: 'Misión', contenido: 'Acompañar proyectos' }]);
  });

  it('incluye el texto en inglés cuando el panel lo tiene', () => {
    const bloques = bloquesDeIdentidad([{ ...seccion('MISION', 'm'), contenidoEn: ' To support projects ' }]);
    expect(bloques).toEqual([{ seccion: 'MISION', etiqueta: 'Misión', contenido: 'm', contenidoEn: 'To support projects' }]);
  });

  it('sin contenidos devuelve una lista vacia', () => {
    expect(bloquesDeIdentidad([])).toEqual([]);
  });
});
