import { describe, expect, it } from 'vitest';
import { INFO_ROLES, PERMISOS_PANEL, ROLES_PANEL, esRol, etiquetaDeRoles, inicioDelPanel, puedeVerSeccion } from './roles';

describe('roles del panel', () => {
  it('reconoce solo los tres roles', () => {
    expect(ROLES_PANEL).toEqual(['ADMINISTRADOR', 'COMERCIAL', 'EDITOR']);
    expect(esRol('COMERCIAL')).toBe(true);
    expect(esRol('ROLE_COMERCIAL')).toBe(false);
    expect(esRol('SUPERUSUARIO')).toBe(false);
    expect(esRol(null)).toBe(false);
  });

  it('cada rol tiene nombre y descripción', () => {
    for (const r of INFO_ROLES) {
      expect(r.nombre.length).toBeGreaterThan(3);
      expect(r.descripcion.length).toBeGreaterThan(20);
    }
  });

  it('el comercial solo ve solicitudes y métricas', () => {
    const ve = Object.keys(PERMISOS_PANEL).filter((s) => puedeVerSeccion(['COMERCIAL'], s));
    expect(ve.sort()).toEqual(['metricas', 'solicitudes']);
  });

  it('el editor ve el contenido y no solicitudes, usuarios, historial, métricas ni reportes', () => {
    const ve = Object.keys(PERMISOS_PANEL).filter((s) => puedeVerSeccion(['EDITOR'], s));
    expect(ve.sort()).toEqual(['casas-modelo', 'contenido-institucional', 'etapas', 'lotes', 'multimedia', 'proyectos', 'ubicaciones', 'zonas-comunes']);
  });

  it('el administrador ve todo', () => {
    expect(Object.keys(PERMISOS_PANEL).every((s) => puedeVerSeccion(['ADMINISTRADOR'], s))).toBe(true);
  });

  it('una sección desconocida no la ve nadie', () => {
    expect(puedeVerSeccion(['ADMINISTRADOR'], 'inventada')).toBe(false);
  });

  it('la pantalla de inicio sale del rol de mayor jerarquía y siempre le está permitida', () => {
    expect(inicioDelPanel(['EDITOR', 'COMERCIAL'])).toBe('metricas');
    expect(inicioDelPanel(['EDITOR'])).toBe('proyectos');
    expect(inicioDelPanel(['ADMINISTRADOR', 'EDITOR'])).toBe('resumen');
    expect(inicioDelPanel([])).toBeNull();
    for (const rol of ROLES_PANEL) expect(puedeVerSeccion([rol], inicioDelPanel([rol])!)).toBe(true);
  });

  it('la etiqueta del navbar es corta, y "Admin" si no hay rol reconocido', () => {
    expect(etiquetaDeRoles(['ADMINISTRADOR'])).toBe('Admin');
    expect(etiquetaDeRoles(['COMERCIAL'])).toBe('Comercial');
    expect(etiquetaDeRoles(['EDITOR'])).toBe('Editor');
    expect(etiquetaDeRoles([])).toBe('Admin');
  });
});
