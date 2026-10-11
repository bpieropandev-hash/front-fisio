import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

export const BREAKPOINT_MOBILE = '(max-width: 480px)';
export const BREAKPOINT_TABLET = '(max-width: 768px)';
export const BREAKPOINT_NAV_COLLAPSE = '(max-width: 960px)';

@Injectable({
  providedIn: 'root'
})
export class BreakpointService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly mobileMatch = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_MOBILE).pipe(map(result => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(BREAKPOINT_MOBILE) }
  );

  private readonly tabletMatch = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_TABLET).pipe(map(result => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(BREAKPOINT_TABLET) }
  );

  private readonly navCollapseMatch = toSignal(
    this.breakpointObserver.observe(BREAKPOINT_NAV_COLLAPSE).pipe(map(result => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(BREAKPOINT_NAV_COLLAPSE) }
  );

  // <=480px: tabelas viram cards, calendário abre em view diária
  isMobile = computed(() => this.mobileMatch());

  // <=768px: formulários empilham em coluna única, dialogs viram full-screen
  isTablet = computed(() => this.tabletMatch());

  // <=960px: menubar colapsa (mesmo breakpoint nativo do PrimeNG)
  isNavCollapsed = computed(() => this.navCollapseMatch());

  isDesktop = computed(() => !this.tabletMatch());
}
