import { describe, expect, it } from 'vitest';
import { escaparHtml, esLugarCercano, esPuntoDePlano, htmlDePin, tituloDeLote } from './puntos';

describe('puntos', () => {
  it('escapa el texto del administrador para que no se inyecte HTML en el visor', () => {
    expect(escaparHtml(`<img src=x onerror="alert('x')">&`))
      .toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
  });

  it('el pin muestra la etiqueta y, si hay lote, su area', () => {
    const html = htmlDePin({ etiqueta: 'C21', loteAreaM2: 11448, loteId: 5 });
    expect(html).toContain('<strong>C21</strong>');
    expect(html).toContain('11.448');
  });

  it('el pin sin lote no muestra area y escapa la etiqueta', () => {
    const html = htmlDePin({ etiqueta: '<b>Sala</b>' });
    expect(html).not.toContain('<small>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;Sala');
  });

  it('un boton sin lote ni etapa es un lugar cercano y se dibuja como rotulo escapado', () => {
    expect(esLugarCercano({ loteId: null, etapaId: undefined })).toBe(true);
    expect(esLugarCercano({ loteId: 5 })).toBe(false);
    expect(esLugarCercano({ etapaId: 2 })).toBe(false);
    expect(esLugarCercano({ zonaComunId: 3 })).toBe(false);

    const html = htmlDePin({ etiqueta: 'Jericó <script>', loteId: null, etapaId: null });
    expect(html).toContain('class="pin-lugar"');
    expect(html).toContain('Jericó &lt;script&gt;');
    expect(html).not.toContain('<small>');
  });

  it('los puntos de urbanismo y de zonas destacadas se ubican por porcentaje', () => {
    expect(esPuntoDePlano({ escena: 'URBANISMO' })).toBe(true);
    expect(esPuntoDePlano({ escena: 'ZONAS' })).toBe(true);
    expect(esPuntoDePlano({ escena: 'ENTORNO' })).toBe(false);
    expect(esPuntoDePlano({ escena: 'AEREA' })).toBe(false);
  });

  it('el titulo del lote une codigo y area', () => {
    expect(tituloDeLote({ codigo: 'C21', areaM2: 800 })).toBe('C21 — 800 m²');
    expect(tituloDeLote({ codigo: 'C21' })).toBe('C21');
  });
});
