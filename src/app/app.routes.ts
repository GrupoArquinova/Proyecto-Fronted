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
    path: 'proyectos',
    loadComponent: () => import('./features/public/proyecto/proyectos-publicos.component')
      .then(m => m.ProyectosPublicosComponent)
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
