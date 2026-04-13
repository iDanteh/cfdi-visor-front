import { Component } from '@angular/core';
import { AuthService } from './core/services/auth.service';

@Component({
  standalone: false,
  selector:   'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  sidebarCollapsed = false;

  constructor(public auth: AuthService) {}

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.auth.logout();
  }
}
