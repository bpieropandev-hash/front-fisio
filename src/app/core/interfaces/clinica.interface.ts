export type ProcedimentoClinico = 'PRESSAO_ARTERIAL' | 'ALONGAMENTO' | 'FORTALECIMENTO' | 'MOBILIZACAO' | 'TERAPIA_MANUAL' | 'EXERCICIO_RESPIRATORIO' | 'PILATES';
export type EquipamentoClinico = 'REFORMER' | 'CADILLAC' | 'CHAIR' | 'BARREL' | 'SOLO' | 'ACESSORIOS';
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
export interface FotoClinicaUpload {
  imagem: File;
  dataCaptura: string;
  regiao: string;
  observacao: string;
}
