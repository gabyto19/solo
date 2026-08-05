import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositComponent } from './deposit/deposit.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { ListComponent } from './list/list.component';
import { PasswordComponent } from './password/password.component';
import { CalculatorComponent } from './calculator/calculator.component';
import { AdminComponent } from './admin/admin.component';
import { AuthGuard, AdminGuard } from './auth.guard';

const routes: Routes = [
  { path: '', component: PasswordComponent },
  { path: 'deposit', component: DepositComponent, canActivate: [AuthGuard] }, 
  { path: 'vehicle', component: VehicleComponent, canActivate: [AuthGuard] }, 
  // Prices now come from the database, which requires a session.
  { path: 'list', component: ListComponent, canActivate: [AuthGuard] },
  { path: 'calculator', component: CalculatorComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
  { path: 'password', component: PasswordComponent }, // Login page route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
