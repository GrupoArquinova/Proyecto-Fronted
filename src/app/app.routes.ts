import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
    loadComponent: () => import('./features/auth/login.component/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'recuperar-password',
    loadComponent: () => import('./features/auth/recuperar-password/recuperar-password.component')
      .then(m => m.RecuperarPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },

  {
    path: 'admin',
    loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard], // revisa la sesión en cada navegación dentro del panel
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      {
        path: 'resumen',
        loadComponent: () => import('./features/admin/resumen/resumen').then(m => m.Resumen)
      },
      {
        path: 'proyectos/nuevo',
        loadComponent: () => import('./features/admin/asistente-proyecto/asistente-proyecto.component')
          .then(m => m.AsistenteProyectoComponent)
      },
      {
        path: 'proyectos',
        loadComponent: () => import('./features/admin/proyectos/proyectos').then(m => m.ProyectosComponent)
      },
      {
        path: 'etapas',
        loadComponent: () => import('./features/admin/etapas/etapas.component').then(m => m.EtapasComponent)
      },
      {
        path: 'lotes',
        loadComponent: () => import('./features/admin/lote/lotes.component').then(m => m.LotesComponent)
      },
      {
        path: 'zonas-comunes',
        loadComponent: () => import('./features/admin/zonas-comunes/zonas-comunes.component')
          .then(m => m.ZonasComunesComponent)
      },
      {
        path: 'casas-modelo',
        loadComponent: () => import('./features/admin/casas-modelo/casas-modelo.component')
          .then(m => m.CasasModeloComponent)
      },
      {
        path: 'multimedia',
        loadComponent: () => import('./features/admin/multimedia/multimedia.component')
          .then(m => m.MultimediaComponent)
      },
      {
        path: 'ubicaciones',
        loadComponent: () => import('./features/admin/ubicaciones/ubicaciones.component')
          .then(m => m.UbicacionesComponent)
      },
      {
        path: 'solicitudes',
        loadComponent: () => import('./features/admin/solicitudes/solicitudes.component')
          .then(m => m.SolicitudesComponent)
      },
      {
        path: 'contenido-institucional',
        loadComponent: () => import('./features/admin/contenido/contenido.component')
          .then(m => m.ContenidoInstitucionalComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/admin/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/reportes/reportes.component').then(m => m.ReportesComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
