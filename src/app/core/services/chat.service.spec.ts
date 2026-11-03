import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideI18nPruebas } from '../../i18n/pruebas';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models/chat.model';
import { ChatService, construirHistorial } from './chat.service';

const msg = (remitente: ChatMessage['remitente'], texto: string, error = false): ChatMessage => ({ remitente, texto, fecha: new Date(), ...(error && { error }) });

describe('ChatService', () => {
  function crear() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideI18nPruebas()] });
    return { servicio: TestBed.inject(ChatService), http: TestBed.inject(HttpTestingController) };
  }

  it('sin historial el cuerpo es el de siempre: pregunta e idioma', () => {
    const { servicio, http } = crear();
    servicio.enviarPregunta('  hola  ').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.body).toEqual({ pregunta: 'hola', idioma: 'es' });
    expect('historial' in req.request.body).toBe(false);
    req.flush('ok');
  });

  it('con historial vacío tampoco lo envía', () => {
    const { servicio, http } = crear();
    servicio.enviarPregunta('hola', []).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/chat`);
    expect('historial' in req.request.body).toBe(false);
    req.flush('ok');
  });

  it('con historial lo añade al cuerpo', () => {
    const { servicio, http } = crear();
    const historial = [{ rol: 'user' as const, texto: 'a' }, { rol: 'model' as const, texto: 'b' }];
    servicio.enviarPregunta('c', historial).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.body).toEqual({ pregunta: 'c', idioma: 'es', historial });
    req.flush('ok');
  });
});

describe('construirHistorial', () => {
  it('conversación vacía: sin historial', () => {
    expect(construirHistorial([])).toEqual([]);
  });

  it('mapea usuario a user e ia a model', () => {
    expect(construirHistorial([msg('usuario', 'p'), msg('ia', 'r')])).toEqual([{ rol: 'user', texto: 'p' }, { rol: 'model', texto: 'r' }]);
  });

  it('toma solo los últimos 6 y el primero es user', () => {
    const lista: ChatMessage[] = [];
    for (let i = 1; i <= 5; i++) lista.push(msg('usuario', `p${i}`), msg('ia', `r${i}`));
    const h = construirHistorial(lista);
    expect(h.length).toBe(6);
    expect(h[0]).toEqual({ rol: 'user', texto: 'p3' });
    expect(h[5]).toEqual({ rol: 'model', texto: 'r5' });
  });

  it('si el recorte deja un model al inicio lo descarta', () => {
    // 7 elementos: los últimos 6 empiezan en un model (r1)
    const h = construirHistorial([msg('usuario', 'p1'), msg('ia', 'r1'), msg('usuario', 'p2'), msg('ia', 'r2'), msg('usuario', 'p3'), msg('ia', 'r3'), msg('usuario', 'p4')].slice(1));
    expect(h[0].rol).toBe('user');
    expect(h.map(t => t.texto)).toEqual(['p2', 'r2', 'p3', 'r3']);
  });

  it('excluye los avisos de error y mantiene la alternancia', () => {
    const h = construirHistorial([msg('usuario', 'p1'), msg('ia', 'r1'), msg('usuario', 'p2'), msg('ia', 'fallo', true), msg('usuario', 'p3'), msg('ia', 'r3')]);
    expect(h.map(t => t.texto)).toEqual(['p1', 'r1', 'p3', 'r3']);
    expect(h.map(t => t.rol)).toEqual(['user', 'model', 'user', 'model']);
  });

  it('termina en model: una pregunta sin respuesta no se envía', () => {
    expect(construirHistorial([msg('usuario', 'p1'), msg('ia', 'r1'), msg('usuario', 'p2')]).map(t => t.texto)).toEqual(['p1', 'r1']);
  });

  it('recorta cada texto a 600 caracteres y quita los vacíos', () => {
    const h = construirHistorial([msg('usuario', 'x'.repeat(900)), msg('ia', '   '), msg('ia', 'ok')]);
    expect(h[0].texto.length).toBe(600);
    expect(h.length).toBe(2);
  });
});
