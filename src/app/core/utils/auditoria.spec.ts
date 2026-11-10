import { describe, expect, it } from 'vitest';
import { claseDeAccion, rutaDeEntidad } from './auditoria';

describe('auditoría', () => {
  it('clasifica la acción por cómo empieza', () => {
    expect(claseDeAccion('CREAR_USUARIO')).toBe('crear');
    expect(claseDeAccion('crear_proyecto')).toBe('crear');
    expect(claseDeAccion('ACTUALIZAR_LOTE')).toBe('editar');
    expect(claseDeAccion('CAMBIAR_ESTADO_SOLICITUD')).toBe('editar');
    expect(claseDeAccion('ELIMINAR_ZONA')).toBe('eliminar');
    expect(claseDeAccion('DESACTIVAR_PROYECTO')).toBe('eliminar');
    expect(claseDeAccion('LOGIN')).toBe('sesion');
    expect(claseDeAccion('EXPORTAR_REPORTE')).toBe('otra');
    expect(claseDeAccion('')).toBe('otra');
    expect(claseDeAccion(undefined as never)).toBe('otra');
  });

  it('lleva cada entidad a su pantalla del panel', () => {
    expect(rutaDeEntidad('USUARIOS')).toBe('/admin/usuarios');
    expect(rutaDeEntidad('PROYECTO')).toBe('/admin/proyectos');
    expect(rutaDeEntidad('ZONAS_COMUNES')).toBe('/admin/zonas-comunes');
    expect(rutaDeEntidad('CASAS_MODELO')).toBe('/admin/casas-modelo');
    expect(rutaDeEntidad('SOLICITUDES_CONTACTO')).toBe('/admin/solicitudes');
    expect(rutaDeEntidad('UBICACIONES')).toBe('/admin/ubicaciones');
    expect(rutaDeEntidad('CONTENIDOS_INSTITUCIONALES')).toBe('/admin/contenido-institucional');
    expect(rutaDeEntidad('Ubicación')).toBe('/admin/ubicaciones');
    expect(rutaDeEntidad('AUTH')).toBeNull();
    expect(rutaDeEntidad('')).toBeNull();
  });
});
