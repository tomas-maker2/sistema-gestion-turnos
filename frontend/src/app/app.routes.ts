import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';
import { Login } from './features/login/login';
import { Layout } from './layout/layout';
import { EnConstruccion } from './shared/en-construccion';

// Las pantallas de gestión se cargan recién cuando se entra a ellas
export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agenda' },
      { path: 'agenda', component: EnConstruccion },
      { path: 'clientes', loadComponent: () => import('./features/clientes/clientes').then((m) => m.Clientes) },
      { path: 'servicios', loadComponent: () => import('./features/servicios/servicios').then((m) => m.Servicios) },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
