import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ManagedUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface PriceState {
  id: number;
  name: string;
  price: number;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  // ── Users (administrator only) ────────────────────────────────

  listUsers(): Observable<ManagedUser[]> {
    return this.http
      .get<{ users: ManagedUser[] }>('/api/users')
      .pipe(map((r) => r.users));
  }

  createUser(email: string, password: string, role: 'admin' | 'user'): Observable<ManagedUser> {
    return this.http
      .post<{ user: ManagedUser }>('/api/users', { email, password, role })
      .pipe(map((r) => r.user));
  }

  updateUser(
    id: number,
    changes: { password?: string; role?: 'admin' | 'user'; is_active?: boolean }
  ): Observable<ManagedUser> {
    return this.http
      .patch<{ user: ManagedUser }>(`/api/users/${id}`, changes)
      .pipe(map((r) => r.user));
  }

  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`/api/users/${id}`);
  }

  // ── Price list ────────────────────────────────────────────────

  /** Readable by any signed-in user; writes below require an administrator. */
  listStates(): Observable<PriceState[]> {
    return this.http
      .get<{ states: PriceState[] }>('/api/states')
      .pipe(map((r) => r.states));
  }

  updateState(id: number, changes: { name?: string; price?: number }): Observable<PriceState> {
    return this.http
      .put<{ state: PriceState }>(`/api/states/${id}`, changes)
      .pipe(map((r) => r.state));
  }

  createState(name: string, price: number): Observable<PriceState> {
    return this.http
      .post<{ state: PriceState }>('/api/states', { name, price })
      .pipe(map((r) => r.state));
  }

  deleteState(id: number): Observable<unknown> {
    return this.http.delete(`/api/states/${id}`);
  }
}
