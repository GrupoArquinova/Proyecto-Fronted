import { PESTANAS, decimal, definicionDe, fecha, legible } from './reportes.definiciones';

describe('reportes · definiciones', () => {
  it('las fechas salen dd/MM/yyyy tal como las guardó el servidor, sin correrse por zona horaria', () => {
    expect(fecha('2026-10-14T23:30:00')).toBe('14/10/2026');
    expect(fecha('2026-10-14T23:30:00', true)).toBe('14/10/2026 23:30');
    expect(fecha('2026-03-01')).toBe('01/03/2026');
    expect(fecha(null)).toBe('');
    expect(fecha('no es una fecha')).toBe('');
  });

  it('las cifras decimales usan coma y puntos de miles', () => {
    expect(decimal(1234.5)).toBe('1.234,50');
    expect(decimal(null)).toBe('0,00');
  });

  it('los nombres de la base se muestran como palabras', () => {
    expect(legible('EN_CONSTRUCCION')).toBe('En construcción');
    expect(legible('EN_GESTION')).toBe('En gestión');
    expect(legible('DISPONIBLE')).toBe('Disponible');
    expect(legible('NUEVO')).toBe('Nuevo');
    expect(legible(null)).toBe('');
  });

  it('hay un reporte por cada exportación del servidor, cada uno con sus filtros', () => {
    expect(PESTANAS.map((p) => p.id)).toEqual(['lotes', 'proyectos', 'etapas', 'estados-comerciales', 'solicitudes', 'actividad']);
    expect(definicionDe('lotes').filtros).toEqual(['proyecto', 'estadoLote', 'fechas', 'inactivos']);
    expect(definicionDe('solicitudes').filtros).toContain('estadoSolicitud');
    expect(definicionDe('actividad').filtros).toEqual(['fechas']);
  });

  it('las columnas dibujan una fila de cada reporte', () => {
    const lote = { proyectoNombre: 'El Encanto', etapaNombre: 'Etapa 1', codigo: 'LT-01', loteNombre: 'Lote 1', areaM2: 800.5,
      estadoComercial: 'DISPONIBLE', publicado: true, activo: false, creadoEn: '2026-10-14T09:00:00' };
    const valores = definicionDe('lotes').columnas.map((c) => c.valor(lote));
    expect(valores).toEqual(['El Encanto', 'Etapa 1', 'LT-01', 'Lote 1', '800,50', 'Disponible', 'Sí', 'No', '14/10/2026']);

    const etapa = { proyectoNombre: 'P', etapaNombre: 'E1', totalLotes: 20, disponibles: 10, reservados: 5, vendidos: 5, areaTotalM2: 16000 };
    const columnas = definicionDe('etapas').columnas;
    expect(columnas[columnas.length - 1].valor(etapa)).toBe(25);
    expect(columnas[columnas.length - 1].valor({ ...etapa, totalLotes: 0, vendidos: 0 })).toBe(0);

    const solicitud = { creadoEn: '2026-10-14T10:05:00', clienteNombre: 'Ana', clienteCorreo: 'a@a.co', clienteTelefono: '300', proyectoNombre: 'P',
      tipologiaNombre: 'Villa Samán', mensaje: 'Hola', estadoNombre: 'EN_GESTION', atendidaPorNombre: 'Sin Atender' };
    const textos = definicionDe('solicitudes').columnas.map((c) => c.valor(solicitud));
    expect(textos).toContain('14/10/2026 10:05');
    expect(textos).toContain('Villa Samán');
    expect(textos).toContain('En gestión');
  });
});
