import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositComponent } from './deposit/deposit.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { ListComponent } from './list/list.component';
import { PasswordComponent } from './password/password.component';
import { AuthGuard } from './auth.guard'; // Import the guard

const routes: Routes = [
  { path: '', component: PasswordComponent },
  { path: 'deposit', component: DepositComponent, canActivate: [AuthGuard] }, 
  { path: 'vehicle', component: VehicleComponent, canActivate: [AuthGuard] }, 
  { path: 'list', component: ListComponent, }, 
  { path: 'password', component: PasswordComponent }, // Password page route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
