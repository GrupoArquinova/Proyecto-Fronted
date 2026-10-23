# ConstructoraFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Seguridad

### Política de seguridad de contenido (CSP) y cabeceras

Las cabeceras viven en `vercel.json`. Lo más importante:

- `script-src 'self'`: no se ejecuta ningún script en línea ni de otro origen.
- `img-src`, `media-src`, `connect-src` y `frame-src` son listas cerradas: Cloudinary (imágenes, video y PDF), el backend, YouTube sin cookies, Vimeo, Google Maps (solo `/maps`), OpenStreetMap y los tours (Matterport, Kuula, CloudPano). Si se agrega un servicio externo hay que sumarlo ahí **y** en `HOSTS_INCRUSTABLES` de `src/app/core/utils/medios.ts`; `npm run e2e:csp` comprueba en un navegador que nada queda bloqueado.
- La tipografía Barlow está autoalojada (paquete `@fontsource/barlow`, declarada en `src/styles.scss`): no se contacta con Google Fonts.
- `Cache-Control: no-store` en `/admin/*` y `/login`, y `no-cache` en `index.html` y las rutas de la aplicación (los archivos con hash siguen cacheándose).
- Los iframes de tours y mapas llevan `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"`. El visor de PDF **no** lleva sandbox porque Chrome bloquea su visor dentro de un iframe con sandbox; ese iframe solo carga PDF de Cloudinary.
- No se añadió `Cross-Origin-Resource-Policy`: no aporta frente a los demás encabezados y podría romper la vista previa al compartir enlaces.

### Por qué se mantiene `style-src 'unsafe-inline'`

Angular inserta en tiempo de ejecución etiquetas `<style>` con los estilos de cada componente, y la CSP las bloquearía sin `'unsafe-inline'`. La alternativa es un *nonce* (`ngCspNonce` / token `CSP_NONCE`), pero el nonce debe ser distinto en cada respuesta y generarse en el servidor; el sitio se sirve como archivos estáticos desde Vercel, sin servidor que lo genere, así que no es viable. El riesgo que queda es bajo porque `script-src 'self'` impide ejecutar código: un estilo inyectado no puede ejecutar JavaScript. Si algún día el sitio se sirve con SSR (`src/server.ts`) se puede volver a evaluar con un nonce por petición.

### JWT en `localStorage` y plan de migración

La sesión del panel guarda el JWT en `localStorage` (clave `jwt_token`). Es legible por cualquier script que corra en la página, así que una vulnerabilidad XSS permitiría robarlo. Mitigaciones actuales: la CSP con `script-src 'self'` (sin scripts en línea ni de terceros), el contenido del administrador nunca se inserta como HTML (Angular lo escapa; las URL de medios pasan por una lista de hosts https), el backend revoca el token al cerrar sesión y al cerrar sesión se borra también el borrador del asistente.

Plan de migración a cookie `HttpOnly` (requiere cambios en el backend): (1) que `/auth/login` y `/auth/renovar` entreguen el token en una cookie `HttpOnly; Secure; SameSite=Strict` (o `Lax`) en vez de en el cuerpo; (2) agregar protección CSRF (token en cabecera o doble cookie) en los métodos que modifican datos y CORS con `allowCredentials`; (3) en el frontend, quitar `localStorage`, enviar las peticiones con `withCredentials: true` y decidir la sesión con un `GET /auth/yo`; (4) como el frontend (Vercel) y el backend (Render) están en dominios distintos, usar un dominio propio común (por ejemplo `www.dominio.com` y `api.dominio.com`) para que la cookie sea del mismo sitio.

### Captcha de los formularios (Cloudflare Turnstile)

Los formularios públicos (inicio y contacto de cada proyecto) envían a `POST /solicitudes-contacto/publico` un `captchaToken` opcional. Si la clave del sitio está **vacía** (estado actual) no se descarga ningún script, no se muestra widget y el envío es el de siempre; el backend tampoco verifica mientras no tenga secreto.

Para activarlo:

1. En el dashboard de Cloudflare: **Turnstile → Add site**. Pon un nombre, agrega los dominios `arquinova.vercel.app` y `localhost` (para probar en local) y elige el modo *Managed*. Cloudflare entrega una **Site Key** (pública) y una **Secret Key** (privada).
2. Pega la Site Key en `turnstileSiteKey` de `src/environments/environment.ts` (producción, el que usa `ng build --configuration vercel`). Opcionalmente también en `environment.development.ts`. Es pública, puede ir en el repositorio.
3. Pon la Secret Key en Render, en el servicio del backend, como variable de entorno `TURNSTILE_SECRET`. **Nunca** va en el frontend ni en el repositorio.
4. Vuelve a desplegar frontend y backend. El botón de enviar queda deshabilitado hasta que el widget entrega el token ("Confirma que no eres un robot"); si el token expira se pide de nuevo.

La CSP de `vercel.json` ya permite `https://challenges.cloudflare.com` en `script-src`, `frame-src` y `connect-src` (lo que indica la documentación de Cloudflare). El script se carga solo al montar un formulario y solo si hay clave (`TurnstileService`, `shared/components/captcha-turnstile`).

### Subidas de archivos

`src/app/core/utils/archivos.ts` valida antes de subir a Cloudinary: lista cerrada de imágenes (JPEG, PNG, WebP, GIF, AVIF; el SVG se rechaza), extensión, tamaño y los primeros bytes del archivo (magic bytes). `CloudinaryService.subirArchivo` aplica la misma validación para que ninguna pantalla se la salte.

### Auditoría de dependencias

El CI corre `npm audit --omit=dev --audit-level=high` (falla si hay algo grave en producción) y además `npm audit` completo como paso informativo. Estado al 22/10/2026: 0 vulnerabilidades en producción; 7 en herramientas de desarrollo (`vite`, `@angular/build`, `@angular/cli` por `@modelcontextprotocol/sdk`, `vitest`), que no llegan al sitio. `npm audit fix` no cambia ningún paquete dentro de los rangos actuales; resolverlos requiere subir Angular CLI/Vitest a versiones nuevas (cambio de versión que se hará al actualizar Angular, no como parche).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
