export interface AssinaturaCreateRequestDTO {
  pacienteIds: number[];
  servicoId: number;
  valorMensal: number;
  diaVencimento: number;
  dataInicio?: string;
}

export interface AssinaturaUpdateRequestDTO {
  valorMensal?: number;
  diaVencimento?: number;
}

export interface AssinaturaTrocarPlanoRequestDTO {
  novoServicoId: number;
  novoValorMensal: number;
  diaVencimento: number;
  dataInicio?: string;
}

export interface AssinaturaTrocaPlanoResponseDTO {
  novaAssinatura: AssinaturaResponseDTO;
  cobrancaMesAtualMantida: boolean;
}

export interface AssinaturaResponseDTO {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  servicoId: number;
  servicoNome: string;
  valorMensal: number;
  diaVencimento: number;
  ativo: boolean;
  dataInicio: string;
  dataCancelamento?: string;
}


