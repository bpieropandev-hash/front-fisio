import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mais-sheet',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mais-sheet.component.html',
  styleUrl: './mais-sheet.component.scss'
})
export class MaisSheetComponent {
  aberto = input(false);
  fechar = output<void>();

  constructor(
    public themeService: ThemeService,
    private authService: AuthService
  ) {}

  aoNavegar(): void {
    this.fechar.emit();
  }

  alternarTema(): void {
    this.themeService.toggleTheme();
  }

  sair(): void {
    this.fechar.emit();
    this.authService.logout();
  }
}
