import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { RecuperarPasswordComponent } from './features/auth/recuperar-password/recuperar-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  // 1. La ruta principal ('') ahora carga el HomeComponent
  { path: '', component: HomeComponent },

  // 2. Ruta para iniciar sesión
  { path: 'login', component: LoginComponent },

  // 3. Panel de administración protegido por guard
  { 
    path: 'admin/dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },

  // 4. Rutas de recuperación de contraseña
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // 5. Una sola ruta comodín al final que redirige al Home si la URL no existe
  { path: '**', redirectTo: '' }
];