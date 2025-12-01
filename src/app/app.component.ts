import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MenubarModule, ButtonModule],
  template: `
    @if (authService.isAuthenticated()) {
      <div class="top-shell">
        <p-menubar [model]="menuItems">
          <ng-template pTemplate="end">
            <p-button
              label="Sair"
              icon="pi pi-sign-out"
              (onClick)="logout()"
              styleClass="p-button-text"
            />
          </ng-template>
        </p-menubar>
      </div>
    }
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .top-shell {
      padding: 1.25rem 2.5rem;
    }

    .main-content {
      padding: 2.5rem;
    }

    @media (max-width: 768px) {
      .top-shell {
        padding: 0.75rem 1rem;
      }

      .main-content {
        padding: 1rem;
      }
    }

    @media (max-width: 480px) {
      .top-shell {
        padding: 0.5rem;
      }

      .main-content {
        padding: 0.75rem;
      }

      ::ng-deep .p-menubar .p-button-label {
        display: none;
      }

      ::ng-deep .p-menubar .p-button-icon {
        margin: 0;
      }
    }
  `]
})
export class AppComponent {
  menuItems = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: '/dashboard'
    },
    {
      label: 'Agenda',
      icon: 'pi pi-calendar',
      routerLink: '/agenda'
    },
    {
      label: 'Pacientes',
      icon: 'pi pi-users',
      routerLink: '/pacientes'
    },
    {
      label: 'Serviços',
      icon: 'pi pi-briefcase',
      routerLink: '/servicos'
    },
    {
      label: 'Financeiro',
      icon: 'pi pi-dollar',
      items: [
        {
          label: 'Assinaturas',
          icon: 'pi pi-id-card',
          routerLink: '/financeiro/assinaturas'
        },
        {
          label: 'Cobranças',
          icon: 'pi pi-money-bill',
          routerLink: '/financeiro/cobrancas'
        }
      ]
    },
    {
      label: 'Relatórios',
      icon: 'pi pi-file-pdf',
      routerLink: '/relatorios'
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
  }
}


