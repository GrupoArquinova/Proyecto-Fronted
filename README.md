# Grupo Arquinova · Frontend

La página web y el panel de administración de **Grupo Arquinova S.A.S.** (arquitectura, ingeniería y gestión de proyectos, Armenia, Quindío). Es lo que ve la gente en el navegador; los datos vienen del [**backend**](https://github.com/GrupoArquinova/Proyecto-Arquinova).

> El sitio tiene dos repositorios: este (**frontend**) y el backend. Los dos deben estar encendidos para ver la página funcionando.

## Tecnologías

| Área | Tecnología |
|---|---|
| Framework | **Angular 21** (componentes independientes, señales, carga diferida de cada pantalla) |
| Idiomas | **Transloco** (español / inglés) |
| Recorridos 360° | Photo Sphere Viewer + plugin de marcadores |
| Captcha | Cloudflare Turnstile |
| Pruebas | **Vitest** (unitarias) · **Playwright** (e2e, incluida una suite de la política de seguridad) |
| Calidad | ESLint (angular-eslint) · Prettier · TypeScript |
| Publicación | **Vercel** (sitio estático) con la política de contenido (CSP) en `vercel.json` |

## Cómo funciona el sitio

```
Personas ──► Frontend (Angular · Vercel) ──► Backend (Spring Boot · Render) ──► MySQL (Aiven)
```

El sitio tiene **dos caras**:

### La parte pública

| Dirección | Qué es |
|---|---|
| `/` | Inicio: presentación, proyecto destacado, servicios, proyectos, la empresa y contacto con formulario |
| `/proyectos` | Listado de proyectos publicados, con filtros |
| `/proyectos/:id` | **Micrositio** de un proyecto |
| `/legal/:tema` | Política de datos, términos, cookies, aviso de privacidad y aviso legal |
| `/login` | Ingreso al panel (no aparece en buscadores) |

El micrositio muestra en su menú lateral **solo las secciones que ya tienen contenido**: bienvenida, ubicación, zonas comunes, casa modelo, lotes, disponibilidad, respaldo, videos y contacto. Si una consulta falla, esa sección desaparece pero el resto sigue funcionando.

Acompañan a la persona en todo el sitio: botón flotante de **WhatsApp**, **asistente de IA** (chat), selector de idioma, pantalla completa y, en el pie, un cuadro para recibir por correo la **tarjeta de Google Wallet** con el QR del sitio (Android). En celulares en vertical se pide girar la pantalla a horizontal.

**Recorridos 360° y lotes:** una panorámica con botones por lote, etapa o zona; un plano con cada lote ubicado en porcentaje y su estado comercial (disponible, reservado, vendido); tarjetas con el detalle de cada lote.

### El panel de administración (`/admin`)

Entra con usuario y contraseña; según el rol ve unas secciones u otras (el backend vuelve a comprobarlo en cada petición):

| Rol | Puede |
|---|---|
| **Administrador** | Todo: resumen, métricas, contenido, solicitudes, usuarios, reportes e historial |
| **Editor** | Proyectos, etapas, lotes, zonas comunes, casas modelo, multimedia, ubicaciones y contenido institucional |
| **Comercial** | Solicitudes de contacto y métricas (solo lectura) |

Incluye un **asistente para crear un proyecto completo** paso a paso (proyecto, ubicación, etapas, lotes, contenido y publicación, con recuperación de borrador), el editor de puntos 360°, la carga masiva de lotes y la descarga de reportes.

### Formulario de contacto

La persona acepta el tratamiento de datos y pasa el captcha; el backend limpia el texto, guarda la solicitud (estado `NUEVO`), avisa al equipo por correo y envía una confirmación al visitante. El equipo la atiende desde el panel.

## Idiomas, SEO y analítica

- **Español e inglés:** los textos fijos están en `src/app/i18n/es.json` y `en.json`; los que escribe el equipo tienen versión en inglés opcional (si falta, se muestra el español). Se recuerda la elección de la persona.
- **SEO:** cada pantalla pone su título y descripción (`SeoService`). Como el sitio es estático, `index.html` trae las etiquetas Open Graph por defecto, y para `/proyectos/:id` Vercel entrega a WhatsApp, Facebook, LinkedIn y X una página con las etiquetas del proyecto servida por el backend (ver `vercel.json`).
- **Imágenes:** las de Cloudinary se piden ya optimizadas (`imagenOptimizada`: formato y calidad automáticos y ancho máximo).
- **Analítica propia sin cookies:** solo suma contadores; respeta "No rastrear" y el Global Privacy Control.

## Seguridad

Política de contenido (CSP) y cabeceras en `vercel.json` (scripts solo del propio sitio y de Turnstile, sin `unsafe-eval`, marcos y conexiones de una lista cerrada); las URL que carga el equipo solo se incrustan si son de orígenes conocidos y seguros; todo se escapa al mostrarse.

## Estructura del proyecto

```
src/app/
  core/         Servicios (API, sesión, SEO, idioma, analítica), guards, modelos y utilidades
  features/
    public/     Inicio, listado, micrositio de proyecto y páginas legales
    admin/      Panel de administración
    auth/       Ingreso y recuperación de contraseña
    whatsapp/   Botón y ventana de WhatsApp
  components/   Asistente de IA
  shared/       Componentes, pipes y directivas reutilizables
  solicitud-wallet/  Cuadro de la tarjeta de Google Wallet
  i18n/         Traducciones (es, en)
src/environments/   Dirección del backend y datos públicos de contacto
e2e/ e2e-csp/       Pruebas de extremo a extremo
```

## Cómo correrlo en tu computador

Necesitas **Node.js 22 o superior** y **Git**, y el [backend](https://github.com/GrupoArquinova/Proyecto-Arquinova) encendido en `http://localhost:8080`.

```bash
git clone https://github.com/GrupoArquinova/Proyecto-Fronted.git
cd Proyecto-Fronted
npm ci
npm start
```

Abre `http://localhost:4200`. Para entrar al panel, ve a `/login` con el administrador de prueba que crea el backend (`docs/datos-iniciales-local.sql` en el repositorio del backend).

La dirección del backend y los datos públicos de contacto están en `src/environments/`. Si el formulario de contacto se queda esperando el captcha en local, deja vacío `turnstileSiteKey` en `src/environments/environment.development.ts`.

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm test` | Pruebas unitarias (Vitest); con `-- --watch=false` corren una sola vez |
| `npm run e2e` | Pruebas de extremo a extremo (Playwright) |
| `npm run lint` | Revisa el código con ESLint |
| `npx ng build --configuration vercel` | Compila el sitio estático para Vercel (`dist/constructora-frontend/browser`) |

## Despliegue

El sitio se publica en **Vercel** como sitio estático. `vercel.json` define la compilación, las reescrituras (`/sitemap.xml` y las vistas previas para redes se piden al backend), las cabeceras de seguridad y la CSP. Hay que mantener actualizada la dirección del backend en `src/environments/environment.ts`, y al agregar un servicio externo (mapas, videos, analítica) añadir su dominio a la CSP.
