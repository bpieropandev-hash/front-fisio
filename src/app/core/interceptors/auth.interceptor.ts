import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';

const RENEWED_TOKEN_HEADER = 'X-Renewed-Token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    tap((event) => {
      // Sliding expiration (P3.3): backend manda token renovado perto do vencimento
      if (event instanceof HttpResponse) {
        const renewedToken = event.headers.get(RENEWED_TOKEN_HEADER);
        if (renewedToken) {
          authService.renovarToken(renewedToken);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Não desloga em erros de login (para não entrar em loop)
      const isLoginEndpoint = req.url.includes(`${API_CONFIG.endpoints.auth}/login`);
      
      // 401 Unauthorized - Token inválido ou expirado, sempre desloga
      if (error.status === 401 && !isLoginEndpoint) {
        authService.logout();
      }
      // 403 Forbidden - NÃO desloga automaticamente
      // 403 significa que o usuário está autenticado, mas não tem permissão
      // para a operação específica. Isso é diferente de não estar autenticado.
      // O componente que fez a requisição deve tratar o erro adequadamente
      // (exibir mensagem de "sem permissão" ao invés de deslogar)
      
      // Para outros erros (400, 404, 500, etc), não desloga
      // Deixa o componente tratar o erro
      
      return throwError(() => error);
    })
  );
};


