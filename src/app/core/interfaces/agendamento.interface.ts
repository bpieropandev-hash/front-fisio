export interface AgendamentoRequestDTO {
  pacienteIds: number[];
  servicoId: number;
  dataHora: string;
  dataFimRecorrencia?: string;
  diasSemana?: number[];
}

export interface AtendimentoUpdateRequestDTO {
  dataHoraInicio?: string;
  dataPagamento?: string;
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
  dataHoraFim?: string;
  statusPagamento?: 'PAID' | 'PAYMENT_PENDING' | string;
  assinaturaId?: number | null;
  modalidadeCobranca?: 'AVULSO' | 'MENSALIDADE' | 'LEGADO';
  dataPagamento?: string | null;
  valorCobrado: number;
  pctClinicaSnapshot: number;
  pctProfissionalSnapshot: number;
  status: string;
  evolucao?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
}

export interface ConcluirAtendimentoLoteItemDTO {
  id: number;
  evolucao: string;
  dataPagamento?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
}

export interface ConcluirAtendimentosLoteRequestDTO {
  atendimentos: ConcluirAtendimentoLoteItemDTO[];
}

export interface FalhaLoteDTO {
  atendimentoId: number;
  motivo: string;
}

export interface ConcluirAtendimentosLoteResponseDTO {
  concluidos: number;
  falhas: FalhaLoteDTO[];
}


