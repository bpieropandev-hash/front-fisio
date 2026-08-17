import { Component, OnInit, signal } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { AccentThemeService } from './core/services/accent-theme.service';
import { UsuarioService } from './core/services/usuario.service';
import { UsuarioMeResponseDTO } from './core/interfaces/usuario.interface';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MenubarModule, ButtonModule, MenuModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  usuarioAtual = signal<UsuarioMeResponseDTO | null>(null);

  avatarMenuItems: MenuItem[] = [
    {
      label: 'Meu Perfil',
      icon: 'pi pi-user',
      command: () => this.router.navigateByUrl('/perfil')
    },
    {
      label: 'Alternar Tema',
      icon: 'pi pi-moon',
      command: () => this.themeService.toggleTheme()
    },
    { separator: true },
    {
      label: 'Sair',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];
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
    private accentThemeService: AccentThemeService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.usuarioService.buscarMe().subscribe({
        next: (usuario) => {
          this.usuarioAtual.set(usuario);
          this.accentThemeService.aplicarCor(usuario.corPrimaria);
          this.accentThemeService.aplicarFonte(usuario.fonteTema);
          this.accentThemeService.aplicarTamanhoFonte(usuario.tamanhoFonte);
        },
        error: () => {
          // Sessão inválida - interceptor/guard já cuidam do redirect; tema fica no default/cache local
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}


