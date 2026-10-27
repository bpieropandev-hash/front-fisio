export type TipoServico = 'FISIOTERAPIA' | 'PILATES';

export interface ServicoCreateRequestDTO {
  nome: string;
  tipo: TipoServico;
  valorBase: number;
  capacidade?: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}

export interface ServicoResponseDTO {
  id: number;
  nome: string;
  tipo: TipoServico;
  valorBase: number;
  capacidade?: number;
  pctClinica: number;
  pctProfissional: number;
  ativo?: boolean;
}

export interface ServicoReajusteRequestDTO {
  dadosServico?: ServicoCreateRequestDTO;
  novoValorBase: number;
  aplicarEmAssinaturasAtivas?: boolean;
  somenteAssinaturasNoValorAntigo?: boolean;
  atualizarCobrancasPendentes?: boolean;
}

export interface ServicoReajusteResponseDTO {
  assinaturasAtualizadas: number;
  cobrancasAtualizadas: number;
  assinaturasIgnoradasIds: number[];
}


