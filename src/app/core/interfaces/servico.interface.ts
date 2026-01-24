export type TipoServico = 'FISIOTERAPIA' | 'PILATES';

export interface ServicoCreateRequestDTO {
  nome: string;
  tipo: TipoServico;
  valorBase: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}

export interface ServicoResponseDTO {
  id: number;
  nome: string;
  tipo: TipoServico;
  valorBase: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}


