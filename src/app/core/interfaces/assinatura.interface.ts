export interface AssinaturaCreateRequestDTO {
  pacienteIds: number[];
  servicoId: number;
  valorMensal: number;
  diaVencimento: number;
  dataInicio?: string;
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


