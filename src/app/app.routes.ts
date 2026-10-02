import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component/login.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { RecuperarPasswordComponent } from './features/auth/recuperar-password/recuperar-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { HomeComponent } from './features/public/home/home.component';
import { Resumen } from './features/admin/resumen/resumen';
import { ProyectosComponent } from './features/admin/proyectos/proyectos';
import { LotesComponent } from './features/admin/lote/lotes.component';
import { EtapasComponent } from './features/admin/etapas/etapas.component';
import { MultimediaComponent } from './features/admin/multimedia/multimedia.component';
import { UbicacionesComponent } from './features/admin/ubicaciones/ubicaciones.component';
import { SolicitudesComponent } from './features/admin/solicitudes/solicitudes.component';
import { ContenidoInstitucionalComponent } from './features/admin/contenido/contenido.component';
import { ReportesComponent } from './features/admin/reportes/reportes.component';
import { ZonasComunesComponent } from './features/admin/zonasComunes/zonas-comunes.component';
import { UsuariosComponent } from './features/admin/usuarios/usuarios.component';
import { CasasModeloComponent } from './features/admin/CasaModelo/casas-modelo.component';
import { ProyectosPublicosComponent } from './features/public/proyecto/proyectos-publicos.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'proyectos', component: ProyectosPublicosComponent},

  { path: 'login', component: LoginComponent },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  {
    path: 'admin',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: Resumen },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'etapas', component: EtapasComponent },
      { path: 'lotes', component: LotesComponent },
      { path: 'zonas-comunes', component: ZonasComunesComponent },
      { path: 'casas-modelo', component: CasasModeloComponent},
      { path: 'multimedia', component: MultimediaComponent },
      { path: 'ubicaciones', component: UbicacionesComponent },
      { path: 'solicitudes', component: SolicitudesComponent },
      { path: 'contenido-institucional', component: ContenidoInstitucionalComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'reportes', component: ReportesComponent }
    ]
  },

  { path: '**', redirectTo: '' }
];