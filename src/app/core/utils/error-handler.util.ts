import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorMessage {
  summary: string;
  detail: string;
  severity: 'error' | 'warn' | 'info';
}

/**
 * Utilitário para tratar erros HTTP e retornar mensagens amigáveis
 */
export class ErrorHandlerUtil {
  static getErrorMessage(error: HttpErrorResponse | Error): ErrorMessage {
    // Se for um erro de rede (sem status)
    if (!(error instanceof HttpErrorResponse)) {
      return {
        summary: 'Erro de Conexão',
        detail: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
        severity: 'error'
      };
    }

    const status = error.status;
    // Prioriza "mensagem" (português) e depois "message" (inglês)
    const errorMessage = error.error?.mensagem || error.error?.message || error.message;

    // Mensagens específicas por status HTTP
    switch (status) {
      case 400:
        return {
          summary: 'Dados Inválidos',
          detail: errorMessage || 'Os dados fornecidos são inválidos. Verifique os campos e tente novamente.',
          severity: 'warn'
        };

      case 401:
        return {
          summary: 'Não Autenticado',
          detail: 'Sua sessão expirou. Por favor, faça login novamente.',
          severity: 'error'
        };

      case 403:
        return {
          summary: 'Sem Permissão',
          detail: errorMessage || 'Você não tem permissão para realizar esta operação.',
          severity: 'warn'
        };

      case 404:
        return {
          summary: 'Não Encontrado',
          detail: errorMessage || 'O recurso solicitado não foi encontrado.',
          severity: 'warn'
        };

      case 409:
        return {
          summary: 'Conflito',
          detail: errorMessage || 'Já existe um registro com essas informações.',
          severity: 'warn'
        };

      case 422:
        return {
          summary: 'Erro de Validação',
          detail: errorMessage || 'Os dados fornecidos não passaram na validação.',
          severity: 'warn'
        };

      case 500:
        return {
          summary: 'Erro no Servidor',
          detail: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
          severity: 'error'
        };

      case 502:
      case 503:
      case 504:
        return {
          summary: 'Serviço Indisponível',
          detail: 'O servidor está temporariamente indisponível. Tente novamente em alguns instantes.',
          severity: 'error'
        };

      case 0:
        // Erro de rede (CORS, timeout, etc)
        return {
          summary: 'Erro de Conexão',
          detail: 'Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.',
          severity: 'error'
        };

      default:
        // Erro genérico
        return {
          summary: 'Erro',
          detail: errorMessage || `Ocorreu um erro inesperado (${status}). Tente novamente.`,
          severity: 'error'
        };
    }
  }

  /**
   * Extrai mensagem de erro específica do backend
   */
  static extractBackendMessage(error: HttpErrorResponse): string | null {
    if (error.error) {
      // Tenta diferentes formatos de resposta de erro
      if (typeof error.error === 'string') {
        return error.error;
      }
      // Campo "mensagem" (português)
      if (error.error.mensagem) {
        return error.error.mensagem;
      }
      // Campo "message" (inglês)
      if (error.error.message) {
        return error.error.message;
      }
      if (error.error.error) {
        return error.error.error;
      }
      if (Array.isArray(error.error) && error.error.length > 0) {
        return error.error[0];
      }
    }
    return null;
  }

  /**
   * Verifica se o erro é de rede (sem conexão)
   */
  static isNetworkError(error: HttpErrorResponse): boolean {
    return error.status === 0 || !navigator.onLine;
  }

  /**
   * Verifica se o erro é de timeout
   */
  static isTimeoutError(error: HttpErrorResponse): boolean {
    // Timeout geralmente retorna status 0 e pode ter mensagem específica
    return error.status === 0 && (
      error.message?.toLowerCase().includes('timeout') ||
      error.error?.message?.toLowerCase().includes('timeout') ||
      error.error?.toLowerCase().includes('timeout')
    );
  }
}

