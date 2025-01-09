import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginResponse } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = '/api';  // Volver a usar URL relativa
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';

  constructor(private http: HttpClient, private router: Router) {
    // Usar URL absoluta para asegurar que llegue al servidor correcto
    this.baseUrl = `http://${window.location.hostname}/api`;
  }

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

  login(username: string, password: string): Observable<LoginResponse> {
    console.log('Attempting login to:', this.baseUrl); // Debug log

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const options = {
      headers: headers,
      withCredentials: true
    };

    return this.http.post<LoginResponse>(
      `${this.baseUrl}/login/`, 
      { username, password },
      options
    ).pipe(
      tap((response: LoginResponse) => {
        console.log('Login response:', response);
        if (response) {
          this.setToken(response.access);
          this.setRefreshToken(response.refresh);
          this.setUser(response.user);
        }
      }),
      catchError(error => {
        console.error('Login error details:', error);
        return throwError(() => error);
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
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (csrfToken) {
      headers = headers.set('X-CSRFToken', csrfToken);
    }

    return headers;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    // Opcional: verificar si el token está expirado
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  handleAuthError(error: any): void {
    if (error.status === 401 || 
        (error.status === 403 && error.error?.code === 'token_not_valid')) {
      console.log('Token expired or invalid, logging out...');
      this.logout();
    }
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
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
        this.handleAuthError(error);
        return throwError(() => error);
      })
    );
  }

  isProfesor(): boolean {
    const user = this.getUser();
    return user ? user.is_profesor : false;
  }

  isAlumno(): boolean {
    const user = this.getUser();
    return user && user.is_alumno === true;
  }
}
