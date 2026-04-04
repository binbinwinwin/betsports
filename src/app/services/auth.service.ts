import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  display_name: string;
}

export const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<User | null>(this.loadUser());

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ access_token: string }>(`${API}/auth/login`, { username, password })
      .pipe(
        tap(({ access_token }) => localStorage.setItem('token', access_token)),
        switchMap(() => this.http.get<User>(`${API}/auth/me`)),
        tap(user => {
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUser.set(user);
        }),
        catchError(err => {
          const msg = err.error?.detail ?? '登入失敗，請稍後再試';
          return throwError(() => new Error(msg));
        })
      );
  }

  register(username: string, password: string, display_name: string): Observable<User> {
    return this.http
      .post<User>(`${API}/auth/register`, { username, password, display_name })
      .pipe(
        catchError(err => {
          const msg = err.error?.detail ?? '註冊失敗，請稍後再試';
          return throwError(() => new Error(msg));
        })
      );
  }

  logout(): void {
    this.http.post(`${API}/auth/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
