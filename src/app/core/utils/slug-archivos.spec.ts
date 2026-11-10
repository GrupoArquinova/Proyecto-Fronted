import { generarSlug, PATRON_SLUG } from './slug';
import { atributoAccept, esImagenPorFirma, mensajeDeSubida, ArchivoInvalidoError, tipoDeArchivo, validarArchivo, validarContenidoArchivo } from './archivos';

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
    expect(atributoAccept(['imagen', 'pdf'])).toBe('image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf');
  });

  it('solo reconoce como imagen jpeg, png, webp, gif y avif (nunca svg ni bmp/tiff)', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) expect(tipoDeArchivo({ type: t })).toBe('imagen');
    for (const t of ['image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon', 'image/heic']) expect(tipoDeArchivo({ type: t })).toBeNull();
  });

  it('rechaza el SVG con un mensaje claro, venga con tipo svg o disfrazado por nombre', () => {
    expect(validarArchivo({ type: 'image/svg+xml', size: 10, name: 'logo.svg' }, ['imagen'])).toContain('SVG');
    expect(validarArchivo({ type: 'image/png', size: 10, name: 'logo.svg' }, ['imagen'])).toContain('SVG');
    expect(validarArchivo({ type: 'image/svg+xml', size: 10 }, ['imagen', 'pdf'])).toContain('no se admiten');
  });

  it('exige que la extensión sea de imagen cuando hay nombre', () => {
    expect(validarArchivo({ type: 'image/png', size: 10, name: 'foto.PNG' }, ['imagen'])).toBeNull();
    expect(validarArchivo({ type: 'image/png', size: 10, name: 'foto.php' }, ['imagen'])).toContain('extensión');
    expect(validarArchivo({ type: 'image/png', size: 10, name: 'foto' }, ['imagen'])).toContain('extensión');
  });

  it('el PDF solo se acepta donde se permite', () => {
    expect(validarArchivo({ type: 'application/pdf', size: 10, name: 'a.pdf' }, ['imagen'])).toContain('imágenes');
    expect(validarArchivo({ type: 'application/pdf', size: 10, name: 'a.pdf' }, ['imagen', 'pdf'])).toBeNull();
  });

  describe('magic bytes', () => {
    const f = (bytes: number[] | string, tipo: string, nombre: string) =>
      new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], nombre, { type: tipo });
    const ascii = (s: string) => [...s].map(c => c.charCodeAt(0));

    it('reconoce las firmas de cada formato', () => {
      expect(esImagenPorFirma(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
      expect(esImagenPorFirma(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
      expect(esImagenPorFirma(new Uint8Array(ascii('GIF89a')))).toBe(true);
      expect(esImagenPorFirma(new Uint8Array([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]))).toBe(true);
      expect(esImagenPorFirma(new Uint8Array([0, 0, 0, 0x1c, ...ascii('ftypavif')]))).toBe(true);
      expect(esImagenPorFirma(new Uint8Array(ascii('<svg xmlns')))).toBe(false);
      expect(esImagenPorFirma(new Uint8Array(ascii('<?xml')))).toBe(false);
      expect(esImagenPorFirma(new Uint8Array([]))).toBe(false);
    });

    it('acepta una imagen real y rechaza una con el contenido cambiado', async () => {
      expect(await validarContenidoArchivo(f([0xff, 0xd8, 0xff, 0xe0, 0, 0], 'image/jpeg', 'a.jpg'), ['imagen'])).toBeNull();
      expect(await validarContenidoArchivo(f('<svg onload=alert(1)>', 'image/png', 'a.png'), ['imagen'])).toContain('contenido');
      expect(await validarContenidoArchivo(f('<html>', 'image/jpeg', 'a.jpg'), ['imagen'])).toContain('contenido');
    });

    it('un PDF debe empezar por %PDF- y un SVG se rechaza antes de leerlo', async () => {
      expect(await validarContenidoArchivo(f('%PDF-1.4 ...', 'application/pdf', 'a.pdf'), ['pdf'])).toBeNull();
      expect(await validarContenidoArchivo(f('MZ', 'application/pdf', 'a.pdf'), ['pdf'])).toContain('PDF');
      expect(await validarContenidoArchivo(f('<svg/>', 'image/svg+xml', 'a.svg'), ['imagen'])).toContain('SVG');
    });

    it('el video no se inspecciona (solo tipo y tamaño)', async () => {
      expect(await validarContenidoArchivo(f('x', 'video/mp4', 'a.mp4'), ['video'])).toBeNull();
    });
  });

  it('mensajeDeSubida muestra el de la validación y oculta el resto de errores', () => {
    expect(mensajeDeSubida(new ArchivoInvalidoError('Sin SVG'), 'genérico')).toBe('Sin SVG');
    expect(mensajeDeSubida(new Error('boom'), 'genérico')).toBe('genérico');
  });
});
