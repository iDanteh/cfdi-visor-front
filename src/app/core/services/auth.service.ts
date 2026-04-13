import { Injectable }                       from '@angular/core';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import { Observable }                        from 'rxjs';

const ROLE_CLAIM = 'https://cfdi-comparator/role';

export interface AppUser {
  id:      string;
  name:    string;
  email:   string;
  role:    string;
  picture: string | null;
}

const GUEST: AppUser = { id: '', name: '', email: '', role: 'viewer', picture: null };

/**
 * AuthService — wrapper sobre @auth0/auth0-angular.
 *
 * Expone la misma interfaz que el stub de desarrollo para que el resto
 * de la app no necesite cambios: isAuthenticated, isLoading, currentUser,
 * login(), logout(), hasRole(), getAccessToken().
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private _isAuth    = false;
  private _isLoading = true;
  private _user: AppUser = GUEST;

  readonly isAuthenticated$: Observable<boolean>;
  readonly isLoading$: Observable<boolean>;

  constructor(private auth0: Auth0Service) {
    this.isAuthenticated$ = this.auth0.isAuthenticated$;
    this.isLoading$       = this.auth0.isLoading$;

    this.auth0.isAuthenticated$.subscribe(v => (this._isAuth    = v));
    this.auth0.isLoading$.subscribe(v       => (this._isLoading = v));
    this.auth0.user$.subscribe(u            => (this._user = u ? this.mapUser(u) : GUEST));
  }

  private mapUser(u: User): AppUser {
    return {
      id:      u.sub      ?? '',
      name:    u.name     ?? u.nickname ?? '',
      email:   u.email    ?? '',
      role:    (u[ROLE_CLAIM] as string) ?? 'viewer',
      picture: u.picture  ?? null,
    };
  }

  get isLoading():       boolean  { return this._isLoading; }
  get isAuthenticated(): boolean  { return this._isAuth; }
  get currentUser():     AppUser  { return this._user; }

  login(): void {
    this.auth0.loginWithRedirect();
  }

  logout(): void {
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this._user.role);
  }

  getAccessToken(): Observable<string> {
    return this.auth0.getAccessTokenSilently();
  }
}
