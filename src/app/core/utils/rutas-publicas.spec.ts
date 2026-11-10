import { describe, expect, it } from 'vitest';
import { esRutaPublica, proyectoIdDeRuta, rutaSinParametros } from './rutas-publicas';

describe('rutas públicas', () => {
  it('quita querystring y fragmento', () => {
    expect(rutaSinParametros('/proyectos/6/ubicacion?vista=mapa#x')).toBe('/proyectos/6/ubicacion');
    expect(rutaSinParametros('/?utm_source=qr')).toBe('/');
    expect(rutaSinParametros('')).toBe('/');
    expect(rutaSinParametros('proyectos')).toBe('/proyectos');
  });

  it('el panel y el acceso no son públicos; /administracion tampoco se confunde con /admin', () => {
    for (const r of ['/admin', '/admin/resumen', '/login', '/recuperar-password', '/reset-password?token=1']) expect(esRutaPublica(r), r).toBe(false);
    for (const r of ['/', '/proyectos', '/proyectos/6/lotes', '/legal/cookies', '/administracion']) expect(esRutaPublica(r), r).toBe(true);
  });

  it('saca el id del proyecto solo de las rutas de un proyecto', () => {
    expect(proyectoIdDeRuta('/proyectos/6/lotes?vista=a')).toBe(6);
    expect(proyectoIdDeRuta('/proyectos/12')).toBe(12);
    expect(proyectoIdDeRuta('/proyectos')).toBeNull();
    expect(proyectoIdDeRuta('/proyectos/abc')).toBeNull();
    expect(proyectoIdDeRuta('/legal/politica-datos')).toBeNull();
  });
});
