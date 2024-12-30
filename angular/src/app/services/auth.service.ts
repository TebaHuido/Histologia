import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8000/api'; // Cambia esto a tu URL de backend
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';

  constructor(private http: HttpClient, private router: Router) {}

  requestCSRFToken(): Observable<any> {
    return this.http.get(`${this.baseUrl}/csrf/`, { withCredentials: true });
  }

  getCSRFToken(): string | null {
    const storedToken = localStorage.getItem('csrfToken');
    if (storedToken) {
      return storedToken;
    }

    const cookieValue = this.getCookie('csrftoken');
    if (cookieValue) {
      localStorage.setItem('csrfToken', cookieValue);
      return cookieValue;
    }

    console.warn('No CSRF token found');
    return null;
  }

  login(username: string, password: string): Observable<any> {
    // Primero obtener el token CSRF
    return this.requestCSRFToken().pipe(
      switchMap(() => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken() || ''
        });

        return this.http.post(
          `${this.baseUrl}/login/`, 
          { username, password },
          { 
            headers,
            withCredentials: true 
          }
        );
      }),
      tap((response: any) => {
        this.setToken(response.access);
        this.setRefreshToken(response.refresh);
        this.setUser(response.user);
        if (response.csrfToken) {
          localStorage.setItem('csrfToken', response.csrfToken);
        }
      })
    );
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); // Verifica si el token está presente
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem('user');
    localStorage.removeItem('csrfToken');
    this.router.navigate(['/login']);
  }

  setUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    const csrfToken = this.getCSRFToken();
    
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (csrfToken) {
      headers = headers.set('X-CSRFToken', csrfToken);
    }

    return headers.set('Content-Type', 'application/json');
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return throwError('No refresh token available');
    }

    return this.http.post(
      `${this.baseUrl}/token/refresh/`, 
      { refresh: refreshToken },
      { withCredentials: true }
    ).pipe(
      tap((response: any) => {
        this.setToken(response.access);
      }),
      catchError((error) => {
        console.error('Error refreshing token:', error);
        this.logout();
        return throwError(error);
      })
    );
  }

  isProfesor(): boolean {
    const user = this.getUser();
    return user ? user.is_profesor : false;
  }
}
