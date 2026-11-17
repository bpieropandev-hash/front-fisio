export type ProcedimentoClinico = string;
export type EquipamentoClinico = string;
export interface EvolucaoClinicaRequest {
  versao: number;
  procedimentos: ProcedimentoClinico[];
  equipamentos: EquipamentoClinico[];
  pressaoSistolica: number | null;
  pressaoDiastolica: number | null;
  dor: number | null;
  observacoes: string;
}
export interface EvolucaoClinica extends EvolucaoClinicaRequest {
  resumo: string;
  autor: string | null;
  atualizadoEm: string | null;
}
export interface FotoClinica {
  id: number;
  pacienteId: number;
  dataCaptura: string;
  regiao: string;
  observacao: string;
  criadoEm: string;
  autor: string;
}
export interface AvaliacaoFisica {
  id: number;
  pacienteId: number;
  dataAvaliacao: string;
  titulo: string;
  observacao: string;
  criadoEm: string;
  autor: string;
  nomeArquivo: string;
  tipoConteudo: 'image/jpeg' | 'image/png' | 'application/pdf';
}
export interface AvaliacaoFisicaUpload {
  arquivo: File;
  dataAvaliacao: string;
  titulo: string;
  observacao: string;
}
export interface FotoClinicaUpload {
  imagem: File;
  dataCaptura: string;
  regiao: string;
  observacao: string;
}
