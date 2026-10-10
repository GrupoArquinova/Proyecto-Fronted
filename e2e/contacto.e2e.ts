import { expect, test } from '@playwright/test';
import { PROYECTO_ID, simularBackend } from './datos-simulados';

test.beforeEach(async ({ page }) => {
  await simularBackend(page);
});

const esEnvio = (r: { url(): string; method(): string }) =>
  r.url().endsWith('/solicitudes-contacto/publico') && r.method() === 'POST';

test.describe('formulario de contacto del proyecto', () => {
  test('con solo el teléfono se puede enviar', async ({ page }) => {
    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await page.getByLabel('Nombre').fill('Ana Gómez');
    await page.getByLabel('Teléfono / WhatsApp').fill('300 123 4567');
    await page.getByLabel('Mensaje').fill('Quiero información de las villas');
    await page.getByRole('checkbox').check();

    const [peticion] = await Promise.all([
      page.waitForRequest(esEnvio),
      page.getByRole('button', { name: 'Enviar mensaje' }).click()
    ]);
    const cuerpo = peticion.postDataJSON();
    expect(cuerpo.telefono).toBe('300 123 4567');
    expect(cuerpo.correo).toBe('');
    expect(cuerpo.proyectoId).toBe(PROYECTO_ID);
  });

  test('con solo el correo se puede enviar', async ({ page }) => {
    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await page.getByLabel('Nombre').fill('Luis Mora');
    await page.getByLabel('Correo').fill('luis@example.com');
    await page.getByLabel('Mensaje').fill('Quisiera una cita');
    await page.getByRole('checkbox').check();

    const [peticion] = await Promise.all([
      page.waitForRequest(esEnvio),
      page.getByRole('button', { name: 'Enviar mensaje' }).click()
    ]);
    expect(peticion.postDataJSON().correo).toBe('luis@example.com');
  });

  test('sin teléfono ni correo no se envía y avisa qué falta', async ({ page }) => {
    let enviada = false;
    page.on('request', r => { if (esEnvio(r)) enviada = true; });

    await page.goto(`/proyectos/${PROYECTO_ID}/contacto`);
    await page.getByLabel('Nombre').fill('Sin Medio');
    await page.getByLabel('Mensaje').fill('Hola');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(page.getByText('Déjanos un teléfono o un correo para poder responderte.')).toBeVisible();
    expect(enviada).toBe(false);
  });
});

test.describe('formulario de contacto del inicio', () => {
  test('el servicio de interés viaja con la solicitud y solo se pide un medio de contacto', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    const formulario = page.locator('.contact-form-card');

    await formulario.getByPlaceholder('Juan Pérez').fill('Marta Ríos');
    await formulario.getByPlaceholder('correo@ejemplo.com').fill('marta@example.com');
    await formulario.locator('select[formControlName="servicioInteres"]').selectOption({ index: 1 });
    await formulario.getByRole('checkbox').check();

    const [peticion] = await Promise.all([
      page.waitForRequest(esEnvio),
      formulario.getByRole('button', { name: 'Enviar solicitud' }).click()
    ]);
    const cuerpo = peticion.postDataJSON();
    expect(cuerpo.correo).toBe('marta@example.com');
    expect(cuerpo.servicioInteres).toBeTruthy();
  });

  test('el botón de enviar sigue apagado sin ningún medio de contacto', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    const formulario = page.locator('.contact-form-card');

    await formulario.getByPlaceholder('Juan Pérez').fill('Marta Ríos');
    await formulario.getByRole('checkbox').check();
    await expect(formulario.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();

    await formulario.getByPlaceholder('Ej: 300 123 4567').fill('3001112233');
    await expect(formulario.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
  });
});
