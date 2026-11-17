import { Injectable, signal } from '@angular/core';

const CHAVE = 'sidebar_recolhida';

/** Preferência da usuária de manter o menu lateral só com ícones (vale no desktop; tablet já é sempre ícones). */
@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly recolhida = signal(SidebarService.ler());

  private static ler(): boolean {
    try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; }
  }

  alternar(): void {
    const proxima = !this.recolhida();
    this.recolhida.set(proxima);
    try { localStorage.setItem(CHAVE, proxima ? '1' : '0'); } catch { /* storage indisponível: vale só na sessão */ }
  }
}
