import { Component } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MenubarModule, ButtonModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
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
    public themeService: ThemeService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
  }
}


