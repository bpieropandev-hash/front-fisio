export interface AgendamentoRequestDTO {
  pacienteId: number;
  servicoId: number;
  dataHora: string;
  dataFimRecorrencia?: string;
  diasSemana?: number[];
}

export interface AtendimentoUpdateRequestDTO {
  dataHoraInicio?: string;
  status?: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO' | 'FALTA';
  evolucao?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
}

export interface AtendimentoResponseDTO {
  id: number;
  pacienteId: number;
  servicoBaseId: number;
  dataHoraInicio: string;
  valorCobrado: number;
  pctClinicaSnapshot: number;
  pctProfissionalSnapshot: number;
  status: string;
  evolucao?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
}


