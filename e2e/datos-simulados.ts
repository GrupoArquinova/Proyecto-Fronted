import { Page } from '@playwright/test';

/** Imagen de 1x1 píxel para todas las fotos simuladas (así las pruebas no dependen de internet). */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

export const PROYECTO_ID = 6;
const IMG = (nombre: string) => `https://imagenes.prueba/${nombre}.png`;

const proyecto = {
  id: PROYECTO_ID, empresaId: 1, nombre: 'El Encanto', slug: 'el-encanto', descripcion: 'Proyecto de prueba', descripcionEn: 'Test project',
  estadoProyecto: 'EN_DISENO', tipoRegistro: 'OFERTA_COMERCIAL', destacado: true, publicado: true, activo: true
};

const casas = [
  { id: 8, proyectoId: PROYECTO_ID, nombre: 'Villa Samán', descripcion: 'Villa de dos plantas', descripcionEn: 'Two-storey villa', areaConstruidaM2: 293, numeroHabitaciones: 3, numeroBanos: 4, publicado: true, activo: true },
  { id: 9, proyectoId: PROYECTO_ID, nombre: 'Villa Guayacán', descripcion: 'Villa de una planta', areaConstruidaM2: 173, numeroHabitaciones: 3, numeroBanos: 4, publicado: true, activo: true },
  { id: 10, proyectoId: PROYECTO_ID, nombre: 'Villa Colibrí', descripcion: 'Villa de una planta', areaConstruidaM2: 192, numeroHabitaciones: 4, numeroBanos: 5, publicado: true, activo: true }
];

const recurso = (id: number, extra: object) => ({ id, tipo: 'IMAGEN', url: IMG(`recurso-${id}`), portada: false, publicado: true, activo: true, orden: id, ...extra });

const multimediaCasas: Record<number, object[]> = {
  8: [
    recurso(101, { casaModeloId: 8, tipo: 'IMAGEN', titulo: 'render_saman_1' }),
    recurso(102, { casaModeloId: 8, tipo: 'IMAGEN', titulo: 'render_saman_2' }),
    recurso(103, { casaModeloId: 8, tipo: 'PLANO', titulo: 'plano_saman_planta1' }),
    recurso(104, { casaModeloId: 8, tipo: 'PLANO', titulo: 'plano_saman_planta2' })
  ],
  9: [recurso(105, { casaModeloId: 9, tipo: 'IMAGEN', titulo: 'render_guayacan_1' })],
  10: []
};

const zonas = [
  { id: 11, proyectoId: PROYECTO_ID, nombre: 'Portería', nombreEn: 'Gatehouse', descripcion: 'Acceso principal', descripcionEn: 'Main entrance', publicado: true, activo: true, imagenes: [] },
  { id: 12, proyectoId: PROYECTO_ID, nombre: 'Jacuzzi', descripcion: '', publicado: true, activo: true, imagenes: [
    { id: 1, zonaComunId: 12, imagenUrl: IMG('jacuzzi-galeria'), orden: 1, esPrincipal: true }
  ] }
];

/** Textos institucionales del panel: la misión está aprobada (publicada); la visión y la identidad no. */
const textosInstitucionales = [
  { id: 1, empresaId: 1, seccion: 'MISION', titulo: 'Misión propuesta', contenido: 'Acompañar a propietarios y promotores en sus proyectos.', publicado: true },
  { id: 2, empresaId: 1, seccion: 'VISION', titulo: 'Visión propuesta', contenido: 'Texto de visión aún sin aprobar.', publicado: false },
  { id: 3, empresaId: 1, seccion: 'IDENTIDAD', titulo: 'Identidad disponible', contenido: 'manual de marca interno', publicado: true }
];

/** Imagen subida desde Multimedia a la amenidad Jacuzzi, marcada como portada. */
export const IMAGEN_PORTADA_JACUZZI = IMG('jacuzzi-portada');
const multimediaZonas: Record<number, object[]> = {
  11: [],
  12: [recurso(201, { zonaComunId: 12, titulo: 'Jacuzzi portada', url: IMAGEN_PORTADA_JACUZZI, portada: true })]
};

/** Responde con datos de prueba a todo lo que el sitio público pide al backend. */
export async function simularBackend(page: Page): Promise<void> {
  await page.route('https://imagenes.prueba/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }));

  await page.route('http://localhost:8080/api/**', route => {
    const url = new URL(route.request().url());
    const ruta = url.pathname.replace('/api', '');
    const json = (cuerpo: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });

    if (ruta === '/solicitudes-contacto/publico' && route.request().method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1, estadoId: 1, estadoNombre: 'NUEVO' }) });
    }
    if (ruta === '/proyectos' && url.searchParams.get('soloPublicados')) return json([proyecto]);
    if (ruta === `/proyectos/${PROYECTO_ID}`) return json(proyecto);
    if (ruta === `/ubicaciones/proyecto/${PROYECTO_ID}`) return json({ proyectoId: PROYECTO_ID, ciudad: 'La Tebaida', departamento: 'Quindío' });
    if (ruta === `/zonas-comunes/proyecto/${PROYECTO_ID}/publicas`) return json(zonas);
    if (ruta === `/casas-modelo/proyecto/${PROYECTO_ID}/publicas`) return json(casas);
    if (ruta === '/lotes/publicos') return json([]);
    if (ruta === `/multimedia/proyecto/${PROYECTO_ID}`) return json([]);

    const casa = ruta.match(/^\/multimedia\/casaModelo\/(\d+)$/);
    if (casa) return json(multimediaCasas[Number(casa[1])] ?? []);
    const zona = ruta.match(/^\/multimedia\/zonaComun\/(\d+)$/);
    if (zona) return json(multimediaZonas[Number(zona[1])] ?? []);

    if (ruta.startsWith('/contenidos-institucionales')) {
      // Como el servidor: con soloPublicados solo devuelve lo publicado
      const soloPublicados = url.searchParams.get('soloPublicados') === 'true';
      return json(textosInstitucionales.filter(t => !soloPublicados || t.publicado));
    }
    if (ruta.startsWith('/puntos-360')) return json([]);
    return json([]);
  });
}
