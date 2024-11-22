import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    const password = sessionStorage.getItem('password');
    if (password) {
      return true; // User is authenticated, proceed to route
    } else {
      this.router.navigate(['/password']); // Redirect to password page if not authenticated
      return false;
    }
  }
}
