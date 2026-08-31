import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Valida também a expiração (claim exp): token vencido no localStorage não pode
  // deixar a tela carregar — as APIs responderiam 401 e o usuário veria erros
  // antes de ser redirecionado.
  if (authService.isTokenValido()) {
    return true;
  }

  authService.limparSessao();
  const returnUrl = state.url;
  router.navigate(['/login'], { queryParams: { returnUrl } });
  return false;
};
