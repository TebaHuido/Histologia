import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Don't intercept auth-related requests
  if (req.url.includes('/login/') || 
      req.url.includes('/token/refresh/') || 
      req.url.includes('/csrf/')) {
    return next(req);
  }

  const token = authService.getToken();
  const csrfToken = authService.getCSRFToken();

  // Clone the request and add auth headers
  const authReq = req.clone({
    headers: req.headers
      .set('Authorization', `Bearer ${token || ''}`)
      .set('X-CSRFToken', csrfToken || '')
      .set('Content-Type', 'application/json'),
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 403 && error.error?.code === 'token_not_valid') {
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Retry the request with new token
            const newToken = authService.getToken();
            const newReq = req.clone({
              headers: req.headers
                .set('Authorization', `Bearer ${newToken}`)
                .set('X-CSRFToken', authService.getCSRFToken() || '')
                .set('Content-Type', 'application/json'),
              withCredentials: true
            });
            return next(newReq);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // No interceptar las solicitudes de login, refresh token o csrf
    if (this.isAuthRoute(request)) {
      return next.handle(request);
    }

    return next.handle(this.addTokenToRequest(request)).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          if (error.error?.code === 'token_not_valid') {
            return this.handle403Error(request, next);
          }
        }
        return throwError(error);
      })
    );
  }

  private isAuthRoute(request: HttpRequest<any>): boolean {
    const authRoutes = ['/api/login/', '/api/token/refresh/', '/api/csrf/'];
    return authRoutes.some(route => request.url.includes(route));
  }

  private addTokenToRequest(request: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.getToken();
    const csrfToken = this.authService.getCSRFToken();

    if (token) {
      let headers = request.headers
        .set('Authorization', `Bearer ${token}`);
      
      if (csrfToken) {
        headers = headers.set('X-CSRFToken', csrfToken);
      }

      return request.clone({
        headers,
        withCredentials: true
      });
    }
    return request;
  }

  private handle403Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((token: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token.access);
          return next.handle(this.addTokenToRequest(request));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(err);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(() => next.handle(this.addTokenToRequest(request)))
    );
  }
}
