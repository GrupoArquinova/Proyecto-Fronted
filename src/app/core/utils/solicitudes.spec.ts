import { FormControl, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import {
  alMenosUnMedioDeContacto, claseEstadoSolicitud, etiquetaEstadoSolicitud, etiquetaEstadoSolicitudPlural
} from './solicitudes';

describe('solicitudes', () => {
  const grupo = (telefono: string, correo: string) => new FormGroup({ telefono: new FormControl(telefono), correo: new FormControl(correo) });

  describe('alMenosUnMedioDeContacto', () => {
    it('es valido con solo telefono', () => expect(alMenosUnMedioDeContacto(grupo('300 123 4567', ''))).toBeNull());
    it('es valido con solo correo', () => expect(alMenosUnMedioDeContacto(grupo('', 'ana@example.com'))).toBeNull());
    it('es valido con ambos', () => expect(alMenosUnMedioDeContacto(grupo('300', 'a@b.co'))).toBeNull());
    it('no es valido sin ninguno', () => expect(alMenosUnMedioDeContacto(grupo('', ''))).toEqual({ sinMedioDeContacto: true }));
    it('los espacios solos no cuentan', () => expect(alMenosUnMedioDeContacto(grupo('   ', '  '))).toEqual({ sinMedioDeContacto: true }));
  });

  describe('estados', () => {
    it('muestra los estados nuevos con su nombre legible', () => {
      expect(etiquetaEstadoSolicitud('NUEVO')).toBe('Nuevo');
      expect(etiquetaEstadoSolicitud('EN_GESTION')).toBe('En gestión');
      expect(etiquetaEstadoSolicitud('CERRADO')).toBe('Cerrado');
      expect(etiquetaEstadoSolicitudPlural('CERRADO')).toBe('Cerradas');
    });

    it('un estado desconocido se muestra en titulo, sin guiones bajos', () => {
      expect(etiquetaEstadoSolicitud('EN_REVISION_LEGAL')).toBe('En revision legal');
    });

    it('la clase de color sale del nombre', () => {
      expect(claseEstadoSolicitud('EN_GESTION')).toBe('estado-en_gestion');
      expect(claseEstadoSolicitud(undefined)).toBe('estado-nuevo');
    });
  });
});
