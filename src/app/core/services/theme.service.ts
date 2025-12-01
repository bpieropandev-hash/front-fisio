import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  
  // Signal para o tema atual
  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Aplica o tema inicial
    this.applyTheme(this.theme());

    // Effect para aplicar o tema quando mudar
    effect(() => {
      this.applyTheme(this.theme());
      this.saveTheme(this.theme());
    });
  }

  private getInitialTheme(): Theme {
    // Verifica se há preferência salva
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    // Verifica preferência do sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    
    if (theme === 'dark') {
      htmlElement.classList.add('dark-mode');
      htmlElement.classList.remove('light-mode');
    } else {
      htmlElement.classList.add('light-mode');
      htmlElement.classList.remove('dark-mode');
    }
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }
}

