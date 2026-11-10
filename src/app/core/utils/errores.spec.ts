import { describe, it, expect } from 'vitest';
import { mensajeDeError } from './errores';

describe('mensajeDeError', () => {
  const generico = 'No se pudo guardar.';

  it('muestra el mensaje corto del backend (mensaje o message)', () => {
    expect(mensajeDeError({ error: { mensaje: 'No puedes eliminar tu propio usuario.' } }, generico)).toBe('No puedes eliminar tu propio usuario.');
    expect(mensajeDeError({ error: { message: 'Ya existe una sección con ese nombre' } }, generico)).toBe('Ya existe una sección con ese nombre');
  });

  it('prefiere mensaje sobre message', () => {
    expect(mensajeDeError({ error: { mensaje: 'A', message: 'B' } }, generico)).toBe('A');
  });

  it('usa el genérico si el texto es largo, multilínea, vacío o no es texto', () => {
    expect(mensajeDeError({ error: { mensaje: 'x'.repeat(201) } }, generico)).toBe(generico);
    expect(mensajeDeError({ error: { mensaje: 'x'.repeat(200) } }, generico)).toBe('x'.repeat(200));
    expect(mensajeDeError({ error: { message: 'java.lang.NullPointerException\n\tat com.x.Y' } }, generico)).toBe(generico);
    expect(mensajeDeError({ error: { mensaje: '   ' } }, generico)).toBe(generico);
    expect(mensajeDeError({ error: { mensaje: { a: 1 } } }, generico)).toBe(generico);
    expect(mensajeDeError({ error: '<html>500</html>' }, generico)).toBe(generico);
    expect(mensajeDeError(null, generico)).toBe(generico);
    expect(mensajeDeError(undefined, generico)).toBe(generico);
    expect(mensajeDeError(new Error('boom'), generico)).toBe(generico);
  });

  it('si mensaje no sirve prueba con message', () => {
    expect(mensajeDeError({ error: { mensaje: 'x'.repeat(500), message: 'Corto' } }, generico)).toBe('Corto');
  });
});
