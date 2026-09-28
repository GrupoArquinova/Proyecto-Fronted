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

export const routes: Routes = [
  // 1. Ruta pública principal
  { path: '', component: HomeComponent, pathMatch: 'full' },

  // 2. Autenticación
  { path: 'login', component: LoginComponent },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // 3. Panel de administración protegido
  { 
    path: 'admin', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: Resumen },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'etapas', component: EtapasComponent},
      { path: 'lotes', component: LotesComponent}
    ]
  },

  // 4. Comodín redirige al home
  { path: '**', redirectTo: '' }
];