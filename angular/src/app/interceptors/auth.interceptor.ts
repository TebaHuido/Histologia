import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip CSRF token request
  if (req.url.includes('/csrf/')) {
    return next(req);
  }

  // Get tokens
  const token = authService.getToken();
  const csrfToken = authService.getCSRFToken();

  // Create new headers immutably
  let headers = req.headers;
  
  // Add Authorization token if exists
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Add CSRF token if exists and method is not GET
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    headers = headers.set('X-CSRFToken', csrfToken);
  }

  // Set Content-Type unless it's FormData
  if (!(req.body instanceof FormData)) {
    headers = headers.set('Content-Type', 'application/json');
  }

  // Clone request with new headers
  const authReq = req.clone({
    headers,
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError(error => {
      // Handle CSRF token errors
      if (error.status === 403 && error.error?.detail?.includes('CSRF')) {
        return authService.requestCSRFToken().pipe(
          switchMap(() => {
            // Retry the request with new CSRF token
            const newReq = req.clone({
              headers: headers.set('X-CSRFToken', authService.getCSRFToken() || ''),
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
