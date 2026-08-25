import { Component, signal, computed, effect, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { RouterOutlet, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { AccentThemeService } from './core/services/accent-theme.service';
import { UsuarioService } from './core/services/usuario.service';
import { BreakpointService } from './core/services/breakpoint.service';
import { UsuarioMeResponseDTO } from './core/interfaces/usuario.interface';
import { Router } from '@angular/router';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { MaisSheetComponent } from './shared/components/mais-sheet/mais-sheet.component';

/** Título exibido no header mobile (spec 10) por prefixo de rota */
const ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/dashboard', title: 'Dashboard' },
  { prefix: '/agenda', title: 'Agenda' },
  { prefix: '/pacientes', title: 'Pacientes' },
  { prefix: '/financeiro', title: 'Financeiro' },
  { prefix: '/servicos', title: 'Serviços' },
  { prefix: '/relatorios', title: 'Relatórios' },
  { prefix: '/perfil', title: 'Perfil' }
];

/** Rotas fora da bottom nav (só chegam via "Mais") — header mobile vira "subtela": voltar + título, sem avatar */
const ROTAS_SECUNDARIAS_MOBILE = ['/servicos', '/relatorios', '/perfil'];

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MenubarModule, ButtonModule, MenuModule, BottomNavComponent, MaisSheetComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
  /** Guarda contra refetch: não é signal — não deve disparar o effect que a usa. */
  private usuarioCarregado = false;
  usuarioAtual = signal<UsuarioMeResponseDTO | null>(null);
  maisSheetAberto = signal(false);

  isMobileShell = computed(() => this.breakpointService.isTablet() && this.authService.isAuthenticated());

  /** Atribuído no constructor (não no field initializer): parameter properties como
   * `this.router` só ficam disponíveis depois que o construtor começa a rodar. */
  private currentUrl!: Signal<string>;

  currentRouteTitle = computed(() => {
    const url = this.currentUrl();
    return ROUTE_TITLES.find(r => url.startsWith(r.prefix))?.title ?? 'Physio Manager';
  });

  isRotaSecundariaMobile = computed(() => {
    const url = this.currentUrl();
    return ROTAS_SECUNDARIAS_MOBILE.some(prefix => url.startsWith(prefix));
  });

  voltar(): void {
    this.location.back();
  }

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
    public breakpointService: BreakpointService,
    private accentThemeService: AccentThemeService,
    private usuarioService: UsuarioService,
    private router: Router,
    private location: Location
  ) {
    this.currentUrl = toSignal(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects)
      ),
      { initialValue: this.router.url }
    );

    // effect (não ngOnInit): login acontece via SPA/router, sem reload — isAuthenticated()
    // só vira true bem depois do boot, e ngOnInit já rodou faz tempo nesse ponto.
    effect(() => {
      if (this.authService.isAuthenticated() && !this.usuarioCarregado) {
        this.usuarioCarregado = true;
        this.usuarioService.buscarMe().subscribe({
          next: (usuario) => {
            this.usuarioAtual.set(usuario);
            this.accentThemeService.aplicarCor(usuario.corPrimaria);
            this.accentThemeService.aplicarFonte(usuario.fonteTema);
            this.accentThemeService.aplicarTamanhoFonte(usuario.tamanhoFonte);
          },
          error: () => {
            // Sessão inválida - interceptor/guard já cuidam do redirect; tema fica no default/cache local
            this.usuarioCarregado = false;
          }
        });
      }
      if (!this.authService.isAuthenticated()) {
        this.usuarioCarregado = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}


