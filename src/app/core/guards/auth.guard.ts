import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

/**
 * AuthGuard — STUB para desarrollo.
 *
 * Siempre permite la navegación. Para restaurar protección real,
 * verificar AuthService.isAuthenticated y redirigir a /login si false.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  canActivate(): boolean {
    return true; // STUB: siempre permite
  }
}
