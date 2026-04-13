import { Injectable }                from '@angular/core';
import { CanActivate, Router,
         ActivatedRouteSnapshot }    from '@angular/router';
import { Observable }                from 'rxjs';
import { filter, switchMap, take, map } from 'rxjs/operators';
import { AuthService }               from '../services/auth.service';

/**
 * RoleGuard — restringe rutas a roles específicos.
 *
 * Uso en routes:
 *   {
 *     path: 'admin',
 *     canActivate: [AuthGuard, RoleGuard],
 *     data: { roles: ['admin'] },
 *     ...
 *   }
 *
 * Si el usuario no tiene el rol requerido se redirige a /banks.
 * Debe usarse SIEMPRE junto a AuthGuard (que garantiza que hay sesión activa).
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const required: string[] = route.data['roles'] ?? [];

    return this.auth.isLoading$.pipe(
      filter(loading => !loading),
      take(1),
      switchMap(() => this.auth.isAuthenticated$),
      take(1),
      map((authenticated: boolean) => {
        if (!authenticated) {
          this.router.navigate(['/login']);
          return false;
        }
        if (required.length === 0 || this.auth.hasRole(...required)) {
          return true;
        }
        this.router.navigate(['/banks']); // sin permiso → vista principal
        return false;
      }),
    );
  }
}
