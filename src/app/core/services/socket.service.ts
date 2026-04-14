import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                          from '@angular/common';
import { Subject, Observable }                        from 'rxjs';
import { io, Socket }                                 from 'socket.io-client';
import { environment }                                from '../../../environments/environment';

export interface RoleUpdatedEvent {
  role: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {

  private socket: Socket | null = null;
  private _roleUpdated = new Subject<RoleUpdatedEvent>();

  readonly roleUpdated$: Observable<RoleUpdatedEvent> = this._roleUpdated.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  /** Conecta al servidor de sockets. Llamar una vez que el usuario esté autenticado. */
  connect(): void {
    if (!isPlatformBrowser(this.platformId) || this.socket?.connected) return;

    const socketUrl = environment.apiUrl.replace(/\/api$/, '');
    this.socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    this.socket.on('role:updated', (data: RoleUpdatedEvent) => {
      this._roleUpdated.next(data);
    });
  }

  /** Envía el auth0Sub al servidor para unirse a la sala de notificaciones. */
  identify(auth0Sub: string): void {
    if (this.socket?.connected) {
      this.socket.emit('identify', auth0Sub);
    } else {
      // Si aún no está conectado, esperar al evento connect y enviar entonces
      this.socket?.once('connect', () => this.socket?.emit('identify', auth0Sub));
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
