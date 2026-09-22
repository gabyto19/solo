import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PasswordComponent } from './password/password.component';
import { AdminComponent } from './admin/admin.component';
import { PageGuard, AdminGuard } from './auth.guard';
import { PAGES } from './pages';

/**
 * Every page in the registry is behind PageGuard, which admits ordinary users
 * only to the pages an administrator granted them. The guard is what actually
 * enforces this — hiding the links in the nav bar only tidies the menu, since
 * a typed URL would otherwise still open the page.
 */
const routes: Routes = [
  { path: '', component: PasswordComponent },
  ...PAGES.map((page) => ({
    path: page.key,
    component: page.component,
    canActivate: [PageGuard],
    data: { page: page.key },
  })),
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
  { path: 'password', component: PasswordComponent }, // Login page route
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
