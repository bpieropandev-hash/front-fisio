export interface ServicoCreateRequestDTO {
  nome: string;
  valorBase: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}

export interface ServicoResponseDTO {
  id: number;
  nome: string;
  valorBase: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}


