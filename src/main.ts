import { LOCALE_ID, isDevMode, provideZoneChangeDetection } from "@angular/core";
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { PRIMENG_PT_BR } from './app/core/config/primeng-pt-br';

registerLocaleData(localePt);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideZoneChangeDetection(),provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    providePrimeNG({
      ripple: true,
      translation: PRIMENG_PT_BR,
      // Escala de overlays do PrimeNG (valores padrão, explícitos). O CSS do app fica abaixo de 1000.
      zIndex: { modal: 1100, overlay: 1000, menu: 1000, tooltip: 1100 },
      theme: {
        preset: Aura,
        options: {
          prefix: 'pg',
          darkModeSelector: '.dark-mode'
        }
      }
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ]
}).catch(err => console.error(err));


