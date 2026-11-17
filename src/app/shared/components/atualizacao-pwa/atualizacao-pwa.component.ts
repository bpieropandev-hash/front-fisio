import { Component, inject, OnInit } from '@angular/core';
import { PwaUpdateService } from '../../../core/services/pwa-update.service';

/** Aviso discreto de nova versão. Não recarrega sozinho para não perder formulário em edição. */
@Component({
  selector: 'app-atualizacao-pwa',
  template: `
    @if (pwa.atualizacaoDisponivel()) {
      <div class="atualizacao" role="status" aria-live="polite">
        <span class="atualizacao__texto">Nova versão disponível.</span>
        <button type="button" class="atualizacao__acao" [disabled]="pwa.atualizando()" (click)="pwa.aplicar()">
          {{ pwa.atualizando() ? 'Atualizando…' : 'Atualizar' }}
        </button>
      </div>
    }
  `,
  styles: [`
    .atualizacao {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: calc(76px + env(safe-area-inset-bottom));
      z-index: 60;
      display: flex;
      align-items: center;
      gap: 12px;
      width: max-content;
      max-width: calc(100vw - 32px);
      padding: 8px 8px 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-primary);
      color: var(--text-primary);
      box-shadow: 0 8px 24px var(--shadow);
      font-size: 14px;
    }
    .atualizacao__acao {
      min-height: 44px;
      padding: 0 16px;
      border: 0;
      border-radius: 8px;
      background: var(--accent-color);
      color: var(--on-accent);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .atualizacao__acao:disabled { opacity: .6; cursor: default; }
    .atualizacao__acao:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; }
    @media (min-width: 641px) {
      .atualizacao { bottom: 24px; left: auto; right: 24px; transform: none; }
    }
  `]
})
export class AtualizacaoPwaComponent implements OnInit {
  readonly pwa = inject(PwaUpdateService);
  ngOnInit(): void { this.pwa.iniciar(); }
}
