import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

export interface User {
  id: number;
  username: string;
  display_name: string;
}

const API = 'http://localhost:8000';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<User | null>(this.loadUser());

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ access_token: string }>(`${API}/auth/login`, { username, password })
      .pipe(
        tap(({ access_token }) => localStorage.setItem('token', access_token)),
        switchMap(() => this.http.get<User>(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })),
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

  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post(`${API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({ error: () => {} }); // 無論成功失敗都清除
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
