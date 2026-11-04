import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';
import { Login } from './features/login/login';
import { Layout } from './layout/layout';
import { EnConstruccion } from './shared/en-construccion';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agenda' },
      { path: 'agenda', component: EnConstruccion },
      { path: 'clientes', component: EnConstruccion },
      { path: 'servicios', component: EnConstruccion },
      { path: 'usuarios', component: EnConstruccion, canActivate: [adminGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];
