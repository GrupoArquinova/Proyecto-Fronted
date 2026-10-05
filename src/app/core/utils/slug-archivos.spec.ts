import { generarSlug, PATRON_SLUG } from './slug';
import { atributoAccept, tipoDeArchivo, validarArchivo } from './archivos';

describe('generarSlug', () => {
  it('quita tildes, simbolos y espacios', () => {
    expect(generarSlug('Condominio Campestre Los Álamos')).toBe('condominio-campestre-los-alamos');
    expect(generarSlug('  ¡El Encanto #2!  ')).toBe('el-encanto-2');
    expect(generarSlug('Peñón & Cía.')).toBe('penon-cia');
  });

  it('siempre produce un slug que acepta el backend', () => {
    for (const nombre of ['Los Andes', 'Casas  Circacias', 'Etapa 1 - El Roble', 'ÁÉÍÓÚ ñ']) {
      expect(PATRON_SLUG.test(generarSlug(nombre))).toBe(true);
    }
  });

  it('devuelve vacio si no queda ningun caracter util', () => {
    expect(generarSlug('¡¿?!')).toBe('');
  });

  it('respeta el maximo sin dejar un guion al final', () => {
    const slug = generarSlug('aaaa bbbb cccc', 5);
    expect(slug.length).toBeLessThanOrEqual(5);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('archivos', () => {
  const archivo = (type: string, mb: number) => ({ type, size: mb * 1024 * 1024 });

  it('clasifica el tipo de archivo', () => {
    expect(tipoDeArchivo({ type: 'image/webp' })).toBe('imagen');
    expect(tipoDeArchivo({ type: 'video/mp4' })).toBe('video');
    expect(tipoDeArchivo({ type: 'application/pdf' })).toBe('pdf');
    expect(tipoDeArchivo({ type: 'text/plain' })).toBeNull();
  });

  it('acepta un archivo del tipo permitido dentro del limite', () => {
    expect(validarArchivo(archivo('image/jpeg', 5), ['imagen'])).toBeNull();
    expect(validarArchivo(archivo('video/mp4', 90), ['video'])).toBeNull();
  });

  it('rechaza un tipo que no se permite en ese campo', () => {
    expect(validarArchivo(archivo('video/mp4', 5), ['imagen'])).toContain('imágenes');
    expect(validarArchivo(archivo('text/plain', 1), ['imagen', 'pdf'])).toContain('imágenes o PDF');
  });

  it('rechaza un archivo que pasa el limite de su tipo', () => {
    expect(validarArchivo(archivo('image/png', 11), ['imagen'])).toContain('10 MB');
    expect(validarArchivo(archivo('video/mp4', 101), ['video'])).toContain('100 MB');
    expect(validarArchivo(archivo('application/pdf', 21), ['pdf'])).toContain('20 MB');
  });

  it('arma el atributo accept', () => {
    expect(atributoAccept(['imagen', 'pdf'])).toBe('image/*,application/pdf');
  });
});
