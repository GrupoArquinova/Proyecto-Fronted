import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { inicioPanelGuard, roleGuard } from './core/guards/role.guard';
import { PERMISOS_PANEL } from './core/models/roles';

/** Guard de una sección del panel: usa la tabla de permisos por rol (core/models/roles.ts). */
const permiso = (seccion: string) => roleGuard(PERMISOS_PANEL[seccion]);

// Todas las rutas usan lazy loading: cada pantalla se descarga solo cuando se visita,
// asi el panel de administracion no engorda el bundle inicial de la pagina publica.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'legal/:slug',
    loadComponent: () => import('./features/public/legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'proyectos',
    data: {
      seo: { tituloClave: 'seo.proyectosTitulo', descripcionClave: 'seo.proyectosDescripcion' }
    },
    loadComponent: () => import('./features/public/proyecto/proyectos-publicos.component')
      .then(m => m.ProyectosPublicosComponent)
  },

  {
    // Micrositio de un proyecto: el menú lateral solo muestra las secciones con contenido
    path: 'proyectos/:id',
    loadComponent: () => import('./features/public/proyecto-detalle/proyecto-detalle.component')
      .then(m => m.ProyectoDetalleComponent),
    children: [
      { path: '', redirectTo: 'bienvenida', pathMatch: 'full' },
      {
        path: 'bienvenida',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/bienvenida/bienvenida.component')
          .then(m => m.BienvenidaComponent)
      },
      {
        path: 'ubicacion',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/ubicacion/ubicacion.component')
          .then(m => m.UbicacionComponent)
      },
      {
        path: 'zonas-comunes',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/zonas-comunes/zonas-comunes.component')
          .then(m => m.ZonasComunesPublicoComponent)
      },
      {
        path: 'casa-modelo',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/casa-modelo/casa-modelo.component')
          .then(m => m.CasaModeloPublicoComponent)
      },
      {
        path: 'contacto',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/contacto/contacto.component')
          .then(m => m.ContactoPublicoComponent)
      },
      {
        path: 'lotes',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/lotes/lotes.component')
          .then(m => m.LotesPublicoComponent)
      },
      {
        path: 'disponibilidad',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/disponibilidad/disponibilidad.component')
          .then(m => m.DisponibilidadPublicoComponent)
      },
      {
        path: 'respaldo',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/respaldo/respaldo.component')
          .then(m => m.RespaldoPublicoComponent)
      },
      {
        path: 'videos',
        loadComponent: () => import('./features/public/proyecto-detalle/secciones/videos/videos.component')
          .then(m => m.VideosPublicoComponent)
      },
      // Una sección que no existe (URL escrita a mano) vuelve al inicio del proyecto
      { path: '**', redirectTo: 'bienvenida' }
    ]
  },

  {
    path: 'login',
    data: { seo: { titulo: 'Ingreso al panel', noindex: true } },
    loadComponent: () => import('./features/auth/login.component/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'recuperar-password',
    data: { seo: { titulo: 'Recuperar contraseña', noindex: true } },
    loadComponent: () => import('./features/auth/recuperar-password/recuperar-password.component')
      .then(m => m.RecuperarPasswordComponent)
  },
  {
    path: 'reset-password',
    data: { seo: { titulo: 'Nueva contraseña', noindex: true } },
    loadComponent: () => import('./features/auth/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },

  {
    path: 'admin',
    data: { seo: { titulo: 'Panel de administración', noindex: true } },
    loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard], // revisa la sesión en cada navegación dentro del panel
    children: [
      // Sin pantalla concreta: lleva a la de inicio del rol (administrador: resumen, comercial: métricas, editor: proyectos)
      { path: '', pathMatch: 'full', canActivate: [inicioPanelGuard], children: [] },
      {
        path: 'resumen',
        canActivate: [permiso('resumen')],
        loadComponent: () => import('./features/admin/resumen/resumen').then(m => m.Resumen)
      },
      {
        path: 'metricas',
        canActivate: [permiso('metricas')],
        loadComponent: () => import('./features/admin/metricas/metricas.component').then(m => m.MetricasComponent)
      },
      {
        path: 'proyectos/nuevo',
        canActivate: [permiso('proyectos')],
        loadComponent: () => import('./features/admin/asistente-proyecto/asistente-proyecto.component').then(m => m.AsistenteProyectoComponent)
      },
      {
        path: 'proyectos',
        canActivate: [permiso('proyectos')],
        loadComponent: () => import('./features/admin/proyectos/proyectos').then(m => m.ProyectosComponent)
      },
      {
        path: 'etapas',
        canActivate: [permiso('etapas')],
        loadComponent: () => import('./features/admin/etapas/etapas.component').then(m => m.EtapasComponent)
      },
      {
        path: 'lotes',
        canActivate: [permiso('lotes')],
        loadComponent: () => import('./features/admin/lote/lotes.component').then(m => m.LotesComponent)
      },
      {
        path: 'zonas-comunes',
        canActivate: [permiso('zonas-comunes')],
        loadComponent: () => import('./features/admin/zonas-comunes/zonas-comunes.component').then(m => m.ZonasComunesComponent)
      },
      {
        path: 'casas-modelo',
        canActivate: [permiso('casas-modelo')],
        loadComponent: () => import('./features/admin/casas-modelo/casas-modelo.component').then(m => m.CasasModeloComponent)
      },
      {
        path: 'multimedia',
        canActivate: [permiso('multimedia')],
        loadComponent: () => import('./features/admin/multimedia/multimedia.component').then(m => m.MultimediaComponent)
      },
      {
        path: 'ubicaciones',
        canActivate: [permiso('ubicaciones')],
        loadComponent: () => import('./features/admin/ubicaciones/ubicaciones.component').then(m => m.UbicacionesComponent)
      },
      {
        path: 'solicitudes',
        canActivate: [permiso('solicitudes')],
        loadComponent: () => import('./features/admin/solicitudes/solicitudes.component').then(m => m.SolicitudesComponent)
      },
      {
        path: 'contenido-institucional',
        canActivate: [permiso('contenido-institucional')],
        loadComponent: () => import('./features/admin/contenido/contenido.component').then(m => m.ContenidoInstitucionalComponent)
      },
      {
        path: 'usuarios',
        canActivate: [permiso('usuarios')],
        loadComponent: () => import('./features/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'historial',
        canActivate: [permiso('historial')],
        loadComponent: () => import('./features/admin/historial/historial.component').then(m => m.HistorialComponent)
      },
      {
        path: 'reportes',
        canActivate: [permiso('reportes')],
        loadComponent: () => import('./features/admin/reportes/reportes.component').then(m => m.ReportesComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
