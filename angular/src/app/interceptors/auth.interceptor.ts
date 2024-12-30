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
  
  if (req.url.includes('/login/') || 
      req.url.includes('/token/refresh/') || 
      req.url.includes('/csrf/')) {
    return next(req);
  }

  const token = authService.getToken();
  const csrfToken = authService.getCSRFToken();

  let newReq = req;

  if (token) {
    newReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      withCredentials: true
    });
  }

  return next(newReq);
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
