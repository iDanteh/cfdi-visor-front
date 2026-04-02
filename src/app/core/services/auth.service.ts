import { Injectable } from '@angular/core';

/**
 * AuthService — STUB para desarrollo.
 *
 * Siempre reporta usuario autenticado con rol admin.
 * Para restaurar autenticación real, implementar login/logout con JWT
 * y reemplazar isAuthenticated por verificación de token válido.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // STUB: siempre autenticado
  get isAuthenticated(): boolean {
    return true;
  }

  // STUB: usuario ficticio de desarrollo
  get currentUser() {
    return { id: 'dev', name: 'Desarrollador', role: 'admin' };
  }

  getToken(): string | null {
    return null; // Sin token en modo stub
  }

  hasRole(..._roles: string[]): boolean {
    return true; // Siempre autorizado
  }

  logout(): void {
    // No-op en modo stub
  }
}
