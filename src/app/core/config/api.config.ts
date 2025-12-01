import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  production: environment.production,
  baseUrl: environment.apiUrl,
  endpoints: {
    auth: '/api/auth',
    pacientes: '/api/v1/pacientes',
    servicos: '/api/v1/servicos',
    agendamentos: '/api/v1/agendamentos',
    assinaturas: '/api/v1/assinaturas',
    cobrancas: '/api/v1/cobrancas',
    financeiro: '/api/v1/financeiro',
    relatorios: '/api/v1/relatorios',
    dashboard: '/api/v1/dashboard'
  }
};


