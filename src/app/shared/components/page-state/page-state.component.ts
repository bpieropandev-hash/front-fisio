import { Component, input, output } from '@angular/core';

/** Estado de consulta compartilhado: só mostra vazio depois de uma resposta bem-sucedida. */
@Component({
 selector: 'app-page-state',
 standalone: true,
 template: `
  @if (loading()) {
   <section class="state" role="status" aria-live="polite" aria-busy="true">
    <span class="caption">{{ loadingLabel() }}</span>
    <div class="skeleton" aria-hidden="true"></div><div class="skeleton short" aria-hidden="true"></div>
    <div class="skeleton" aria-hidden="true"></div>
   </section>
  } @else if (error()) {
   <section class="state state-error" role="alert">
    <strong>Não foi possível carregar</strong><p>{{ error() }}</p>
    <button type="button" (click)="retry.emit()">Tentar novamente <span aria-hidden="true">↻</span></button>
   </section>
  } @else if (empty()) {
   <section class="state" role="status"><strong>{{ emptyLabel() }}</strong><p>{{ emptyHint() }}</p></section>
  }
 `,
 styles: [`
  :host { display: block; width: 100%; max-width: 1200px; margin-inline: auto; }
  .state { max-width: 100%; padding: 1.25rem; margin-block: .75rem; border: 1px solid var(--border-color);
   border-radius: 12px; background: var(--bg-secondary); color: var(--text-primary); font-family: var(--font-body); }
  .caption, p { color: var(--text-secondary); font-size: .875rem; }
  p { margin: .5rem 0 1rem; overflow-wrap: anywhere; }
  .state-error { border-inline-start: 3px solid var(--accent-color); }
  .skeleton { height: 1rem; margin-top: .875rem; background: var(--bg-tertiary); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite alternate; }
  .short { width: 65%; }
  button { min-height: 44px; padding: .625rem 1rem; border: 1px solid var(--border-color); border-radius: 8px;
   background: var(--bg-primary); color: var(--text-primary); font: inherit; cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 3px; }
  @keyframes pulse { to { opacity: .45; } }
  @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
  @media (max-width: 600px) { .state { padding: 1rem; } button { width: 100%; } }
 `]
})
export class PageStateComponent {
 readonly loading = input(false);
 readonly error = input('');
 readonly empty = input(false);
 readonly loadingLabel = input('Carregando dados…');
 readonly emptyLabel = input('Nenhum registro encontrado');
 readonly emptyHint = input('Confira os filtros ou cadastre um novo registro.');
 readonly retry = output<void>();
}
