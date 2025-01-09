import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private baseUrl: string;

  constructor() {
    // Usar la IP/hostname del servidor cuando se accede desde la red
    this.baseUrl = `http://${window.location.hostname}`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
