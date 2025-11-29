export interface CobrancaMensalUpdateRequestDTO {
  status: 'PENDENTE' | 'PAGO';
  dataPagamento?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
}

export interface CobrancaMensalResponseDTO {
  id: number;
  assinaturaId: number;
  descricao: string;
  mesReferencia: number;
  anoReferencia: number;
  valor: number;
  status: 'PENDENTE' | 'PAGO';
  dataPagamento?: string;
  recebedor?: 'CLINICA' | 'PROFISSIONAL';
  tipoPagamento?: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';
  pctClinicaSnapshot: number;
  pctProfissionalSnapshot: number;
}

export interface GerarCobrancasRequestDTO {
  mes: number;
  ano: number;
}


