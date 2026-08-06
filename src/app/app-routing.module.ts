import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositComponent } from './deposit/deposit.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { PasswordComponent } from './password/password.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { AdminComponent } from './admin/admin.component';
import { AuthGuard, AdminGuard } from './auth.guard';

/**
 * The `user` role reaches the calculator and nothing else, so every other
 * signed-in page is behind AdminGuard. The guard is what actually enforces
 * this — hiding the links in the nav bar only tidies the menu, since a typed
 * URL would otherwise still open the page.
 */
const routes: Routes = [
  { path: '', component: PasswordComponent },
  { path: 'deposit', component: DepositComponent, canActivate: [AdminGuard] },
  { path: 'vehicle', component: VehicleComponent, canActivate: [AdminGuard] },
  { path: 'calculator', component: CalculatorComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
  { path: 'password', component: PasswordComponent }, // Login page route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
