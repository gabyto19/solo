import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface CurrentUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Null until /api/auth/me has answered; drives guards and the nav bar. */
  private readonly userSubject = new BehaviorSubject<CurrentUser | null>(null);
  readonly user$ = this.userSubject.asObservable();

  private loaded = false;

  constructor(private http: HttpClient) {}

  get user(): CurrentUser | null {
    return this.userSubject.value;
  }

  get isAdmin(): boolean {
    return this.userSubject.value?.role === 'admin';
  }

  /**
   * Resolve the session once per page load. The session lives in an HttpOnly
   * cookie, so the browser cannot read it directly — the server must be asked.
   */
  ensureLoaded(): Observable<CurrentUser | null> {
    if (this.loaded) return of(this.userSubject.value);
    return this.http.get<{ user: CurrentUser | null }>('/api/auth/me').pipe(
      map((res) => res.user),
      tap((user) => {
        this.userSubject.next(user);
        this.loaded = true;
      }),
      catchError(() => {
        this.loaded = true;
        this.userSubject.next(null);
        return of(null);
      })
    );
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http
      .post<{ user: CurrentUser }>('/api/auth/login', { email, password })
      .pipe(
        map((res) => res.user),
        tap((user) => {
          this.userSubject.next(user);
          this.loaded = true;
        })
      );
  }

  logout(): Observable<unknown> {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => {
        this.userSubject.next(null);
        this.loaded = true;
      })
    );
  }
}
