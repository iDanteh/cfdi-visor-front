import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * AuthInterceptor — STUB para desarrollo.
 *
 * No adjunta token (backend usa auth.stub que no requiere uno).
 * Para restaurar autenticación real, leer el token de AuthService
 * y adjuntarlo como 'Authorization: Bearer <token>'.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req); // STUB: pasa sin modificar
  }
}
