import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'news',
    loadComponent: () => import('./pages/news/news').then(m => m.News),
  },
  {
    path: 'news/:id',
    loadComponent: () => import('./pages/news/news-detail').then(m => m.NewsDetail),
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history').then(m => m.History),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
  },
  {
    path: 'deposit',
    loadComponent: () => import('./pages/transaction/transaction').then(m => m.Transaction),
  },
  {
    path: 'withdraw',
    loadComponent: () => import('./pages/transaction/transaction').then(m => m.Transaction),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
