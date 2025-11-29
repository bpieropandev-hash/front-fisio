import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agenda',
    loadComponent: () => import('./features/agenda/agenda.component').then(m => m.AgendaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pacientes',
    loadComponent: () => import('./features/pacientes/pacientes.component').then(m => m.PacientesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'servicos',
    loadComponent: () => import('./features/servicos/servicos.component').then(m => m.ServicosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'financeiro',
    children: [
      {
        path: 'assinaturas',
        loadComponent: () => import('./features/financeiro/assinaturas/assinaturas.component').then(m => m.AssinaturasComponent),
        canActivate: [authGuard]
      },
      {
        path: 'cobrancas',
        loadComponent: () => import('./features/financeiro/cobrancas/cobrancas.component').then(m => m.CobrancasComponent),
        canActivate: [authGuard]
      }
    ]
  },
  {
    path: 'relatorios',
    loadComponent: () => import('./features/relatorios/relatorios.component').then(m => m.RelatoriosComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];


