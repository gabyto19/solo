import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

/**
 * Gate on the server-issued session rather than a flag in sessionStorage.
 * The previous check could be satisfied from the browser console; this one
 * cannot, because the API verifies a signed HttpOnly cookie on every call.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.ensureLoaded().pipe(
      map((user) => {
        if (user) return true;
        this.router.navigate(['/password']);
        return false;
      })
    );
  }
}

/** Same, but additionally requires the administrator role. */
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.ensureLoaded().pipe(
      map((user) => {
        if (user?.role === 'admin') return true;
        this.router.navigate([user ? '/calculator' : '/password']);
        return false;
      })
    );
  }
}
