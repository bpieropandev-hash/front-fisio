export type TipoPendencia = 'ATENDIMENTO_AVULSO' | 'ASSINATURA';

export interface AlertaPendenciaDTO {
  nomePaciente: string;
  tipoPendencia: TipoPendencia;
  descricao: string;
}

export interface DashboardResumoDTO {
  totalAtendimentos: number;
  atendimentosPagamentoPendente: number;
  faturamentoProfissional: number;
  alertasPendencia: AlertaPendenciaDTO[];
}


