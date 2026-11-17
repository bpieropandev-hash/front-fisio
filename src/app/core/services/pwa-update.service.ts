import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Intervalo entre checagens de nova versão enquanto o app fica aberto (PWA instalado quase nunca recarrega sozinho). */
export const INTERVALO_CHECAGEM_MS = 30 * 60 * 1000;

/**
 * Mantém o PWA em dia após um deploy. O service worker baixa a versão nova em segundo plano,
 * mas o app já aberto continua na antiga até recarregar; num PWA instalado isso pode durar dias.
 * Este serviço checa por versão nova (ao abrir, ao voltar para o app e periodicamente) e avisa o usuário.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly sw = inject(SwUpdate);
  private iniciado = false;
  readonly atualizacaoDisponivel = signal(false);
  readonly atualizando = signal(false);

  iniciar(): void {
    if (this.iniciado || !this.sw.isEnabled) return;
    this.iniciado = true;
    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.atualizacaoDisponivel.set(true));
    // Cache do worker corrompido ou versão apagada do servidor: único caminho é recarregar.
    this.sw.unrecoverable.subscribe(() => this.recarregar());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.verificar();
    });
    setInterval(() => void this.verificar(), INTERVALO_CHECAGEM_MS);
    void this.verificar();
  }

  async verificar(): Promise<void> {
    try {
      // true = versão nova detectada. O evento VERSION_READY nem sempre chega a uma sessão longa
      // (cliente sem versão atribuída), então o retorno da checagem também liga o aviso.
      if (await this.sw.checkForUpdate()) this.atualizacaoDisponivel.set(true);
    } catch { /* offline ou worker ainda registrando: tenta na próxima */ }
  }

  async aplicar(): Promise<void> {
    if (this.atualizando()) return;
    this.atualizando.set(true);
    try { await this.sw.activateUpdate(); } catch { /* recarregar ainda busca a versão mais nova */ }
    this.recarregar();
  }

  protected recarregar(): void { document.location.reload(); }
}
