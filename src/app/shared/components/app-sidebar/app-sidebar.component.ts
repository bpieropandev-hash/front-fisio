import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { SidebarService } from '../../../core/services/sidebar.service';

interface ItemNav {
  rotulo: string;
  icone: string;
  rota: string;
}

/** Navegação principal do desktop e do tablet (spec 12): sidebar completa, ou rail de ícones quando `compacto`. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss']
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly usuarioService = inject(UsuarioService);

  private readonly sidebarService = inject(SidebarService);

  readonly compacto = input(false);
  /** Mostra o botão de recolher/expandir (no tablet o menu já é sempre só ícones). */
  readonly recolhivel = input(false);
  readonly recolhida = this.sidebarService.recolhida;

  alternarRecolhimento(): void {
    this.sidebarService.alternar();
  }

  readonly principais: ItemNav[] = [
    { rotulo: 'Dashboard', icone: 'pi-home', rota: '/dashboard' },
    { rotulo: 'Agenda', icone: 'pi-calendar', rota: '/agenda' },
    { rotulo: 'Pacientes', icone: 'pi-users', rota: '/pacientes' },
    { rotulo: 'Serviços', icone: 'pi-briefcase', rota: '/servicos' }
  ];

  readonly financeiro: ItemNav[] = [
    { rotulo: 'Assinaturas', icone: 'pi-id-card', rota: '/financeiro/assinaturas' },
    { rotulo: 'Cobranças', icone: 'pi-money-bill', rota: '/financeiro/cobrancas' }
  ];

  readonly relatorios: ItemNav = { rotulo: 'Relatórios', icone: 'pi-file-pdf', rota: '/relatorios' };

  readonly usuario = this.usuarioService.usuarioAtual;
  readonly escuro = computed(() => this.themeService.theme() === 'dark');
  readonly nome = computed(() => this.usuario()?.nome || this.usuario()?.login || 'Perfil');
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());

  alternarTema(): void {
    this.themeService.toggleTheme();
  }

  sair(): void {
    this.authService.logout();
  }
}
