import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

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

  // Only set "Content-Type: application/json" if not uploading files
  let headers = req.headers
    .set('Authorization', `Bearer ${token || ''}`)
    .set('X-CSRFToken', csrfToken || '');
  
  if (!(req.body instanceof FormData)) {
    headers = headers.set('Content-Type', 'application/json');
  }

  // Clone the request and add auth headers
  const authReq = req.clone({
    headers,
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
