import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/banks', pathMatch: 'full' },
  {
    path: 'banks',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/banks/banks.module').then(m => m.BanksModule),
  },
  {
    path: 'account-plan',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/account-plan/account-plan.module').then(m => m.AccountPlanModule),
  },
  {
    path: 'collection-requests',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/collection-requests/collection-request.module').then(m => m.CollectionRequestModule),
  },
  { path: '**', redirectTo: '/banks' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
