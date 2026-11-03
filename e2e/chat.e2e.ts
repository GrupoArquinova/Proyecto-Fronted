import { expect, test } from '@playwright/test';
import { simularBackend } from './datos-simulados';

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

test.describe('asistente de IA', () => {
  test('se abre, responde con la IA y no tapa los botones de la derecha', async ({ page }) => {
    let cuerpo: { pregunta: string; idioma: string } | null = null;
    await page.route(/\/api\/chat$/, route => {
      cuerpo = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Tenemos la Villa Samán, de 293 m².' });
    });
    await page.goto('/');

    const boton = page.getByRole('button', { name: 'Asistente IA' });
    await expect(boton).toBeVisible();
    await boton.click();
    await expect(page.getByRole('dialog', { name: 'Asistente Arquinova' })).toBeVisible();
    await expect(page.getByText('Soy el asistente virtual de Arquinova')).toBeVisible();

    await page.getByPlaceholder('Escribe tu consulta...').fill('¿Qué villas hay?');
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click();

    await expect(page.getByText('Tenemos la Villa Samán, de 293 m².')).toBeVisible();
    expect(cuerpo!.pregunta).toBe('¿Qué villas hay?');
    expect(cuerpo!.idioma).toBe('es');

    // No se superpone con los otros botones flotantes (WhatsApp y pantalla completa)
    const caja = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
    const chat = await caja('.chat-toggle-btn');
    const whatsappCaja = await caja('.whatsapp-btn-float');
    expect(chat.x + chat.width, 'la píldora queda a la izquierda de WhatsApp').toBeLessThan(whatsappCaja.x);
    for (const otro of ['.whatsapp-btn-float', 'app-boton-pantalla-completa button']) {
      const b = await caja(otro);
      const seCruzan = chat.x < b.x + b.width && chat.x + chat.width > b.x && chat.y < b.y + b.height && chat.y + chat.height > b.y;
      expect(seCruzan, `el chat tapa a ${otro}`).toBe(false);
    }
  });

  test('la segunda pregunta lleva el historial en la petición y "Nueva conversación" lo reinicia', async ({ page }) => {
    const cuerpos: { pregunta: string; historial?: { rol: string; texto: string }[] }[] = [];
    await page.route(/\/api\/chat$/, route => {
      cuerpos.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: `Respuesta ${cuerpos.length}` });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Asistente IA' }).click();
    const campo = page.getByPlaceholder('Escribe tu consulta...');
    await expect(campo).toBeFocused();
    const enviar = page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true });

    await campo.fill('primera');
    await enviar.click();
    await expect(page.getByText('Respuesta 1')).toBeVisible();
    await campo.fill('segunda');
    await enviar.click();
    await expect(page.getByText('Respuesta 2')).toBeVisible();

    expect(cuerpos[0].historial).toBeUndefined();
    expect(cuerpos[1].pregunta).toBe('segunda');
    expect(cuerpos[1].historial).toEqual([{ rol: 'user', texto: 'primera' }, { rol: 'model', texto: 'Respuesta 1' }]);

    await page.getByRole('button', { name: 'Nueva conversación' }).click();
    await expect(page.getByText('Respuesta 1')).toHaveCount(0);
    await campo.fill('tercera');
    await enviar.click();
    await expect(page.getByText('Respuesta 3')).toBeVisible();
    expect(cuerpos[2].historial).toBeUndefined();
  });

  test('las preguntas sugeridas se envían como una pregunta normal y desaparecen', async ({ page }) => {
    let cuerpo: { pregunta: string } | null = null;
    await page.route(/\/api\/chat$/, route => {
      cuerpo = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Está en la vía a la costa.' });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Asistente IA' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.locator('.chip')).toHaveCount(4);

    await dialogo.getByRole('button', { name: '¿Dónde queda El Encanto?' }).click();
    await expect(page.getByText('Está en la vía a la costa.')).toBeVisible();
    expect(cuerpo!.pregunta).toBe('¿Dónde queda El Encanto?');
    await expect(dialogo.locator('.chip')).toHaveCount(0);
  });

  test('en inglés el chat sale en inglés y avisa el idioma al servidor', async ({ page }) => {
    let idioma = '';
    await page.route(/\/api\/chat$/, route => {
      idioma = route.request().postDataJSON().idioma;
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'We have Villa Samán.' });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'English' }).click();

    await page.getByRole('button', { name: /AI assistant/ }).click();
    await expect(page.getByText("I'm Arquinova's virtual assistant")).toBeVisible();
    await page.getByPlaceholder('Type your question...').fill('Which villas do you have?');
    await page.getByRole('dialog').getByRole('button', { name: 'Send', exact: true }).click();

    await expect(page.getByText('We have Villa Samán.')).toBeVisible();
    expect(idioma).toBe('en');
  });

  test('si el servicio de IA no está disponible se muestra un aviso amable, no el error técnico', async ({ page }) => {
    await page.route(/\/api\/chat$/, route => route.fulfill({ status: 503, body: '' }));
    await page.goto('/');
    await page.getByRole('button', { name: /Asistente IA/ }).click();
    await page.getByPlaceholder('Escribe tu consulta...').fill('hola');
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar', exact: true }).click();

    await expect(page.getByText(/no puedo responder/)).toBeVisible();
    await expect(page.getByText(/503/)).toHaveCount(0);
  });

  test('no aparece en el panel de administración ni en el login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('app-chat-widget .chat-toggle-btn')).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('app-chat-widget .chat-toggle-btn')).toHaveCount(1);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('app-chat-widget .chat-toggle-btn')).toHaveCount(0);
  });

  test('el botón de WhatsApp está en el sitio público pero no en el login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.whatsapp-btn-float')).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('.whatsapp-btn-float')).toHaveCount(1);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('.whatsapp-btn-float')).toHaveCount(0);
  });
});
