export type OrigemRecibo = { atendimentoId: number; cobrancaId?: never } | { cobrancaId: number; atendimentoId?: never };
export type ReciboCreateRequestDTO = OrigemRecibo & { dataPagamento: string; pagadorNome: string; pagadorDocumento: string };
export interface ReciboResponseDTO {
 id: number; numero: string; atendimentoId: number | null; cobrancaId: number | null;
 pacienteNome: string; pacienteDocumento: string; pagadorNome: string; pagadorDocumento: string;
 emitenteNome: string; emitenteDocumento: string; descricao: string; valor: number;
 dataPagamento: string; tipoPagamento: string; emitidoEm: string;
}
