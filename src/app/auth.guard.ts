import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, hasAdminRights } from './services/auth.service';

/**
 * Gate on the server-issued session rather than a flag in sessionStorage.
 * The previous check could be satisfied from the browser console; this one
 * cannot, because the API verifies a signed HttpOnly cookie on every call.
 */
/**
 * Admits an account to a page from the registry in pages.ts: administrators
 * always, ordinary users only when the page's key is in their `pages` list.
 * The key comes from the route's `data.page`.
 */
@Injectable({ providedIn: 'root' })
export class PageGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.auth.ensureLoaded().pipe(
      map((user) => {
        if (!user) return this.router.parseUrl('/password');
        if (this.auth.canAccess(route.data['page'])) return true;
        return this.router.parseUrl(this.auth.homePath() || '/password');
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
        if (hasAdminRights(user?.role)) return true;
        this.router.navigate([(user && this.auth.homePath()) || '/password']);
        return false;
      })
    );
  }
}
