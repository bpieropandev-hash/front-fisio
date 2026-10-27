import { describe, expect, it } from 'vitest';
import { agruparAtendimentos, ehMensalidade, podeEmitirReciboAtendimento } from './agenda-group.util';
import { AtendimentoResponseDTO } from '../../core/interfaces/agendamento.interface';
const atendimento = (id: number, extra: Partial<AtendimentoResponseDTO> = {}): AtendimentoResponseDTO => ({
 id, pacienteId: id, servicoBaseId: 1, dataHoraInicio: '2026-10-26T09:00:00', dataHoraFim: '2026-10-26T10:00:00', valorCobrado: 80,
 pctClinicaSnapshot: 20, pctProfissionalSnapshot: 80, status: 'AGENDADO', ...extra
});
describe('turmas na agenda', () => {
 it('agrupa apenas serviço, início e fim compatíveis e preserva status individuais', () => {
  const grupos = agruparAtendimentos([atendimento(1), atendimento(2, {status:'CONCLUIDO'}), atendimento(3,{dataHoraFim:'2026-10-26T09:30:00'}), atendimento(4,{servicoBaseId:2})]);
  expect(grupos.map(g => g.participantes.map(p => p.id))).toEqual([[1,2],[3],[4]]);
  expect(grupos[0].participantes.map(p => p.status)).toEqual(['AGENDADO','CONCLUIDO']);
 });
 it('filtra participantes antes de agrupar', () => {
  const grupos = agruparAtendimentos([atendimento(1), atendimento(2,{status:'CONCLUIDO'}), atendimento(3)], {status:['CONCLUIDO']});
  expect(grupos.flatMap(g => g.participantes.map(p => p.id))).toEqual([2]);
  expect(agruparAtendimentos([atendimento(1),atendimento(2)], {pacienteId:2})[0].participantes.map(p => p.id)).toEqual([2]);
 });
 it('não assume duração igual quando falta o fim no legado', () => {
  expect(agruparAtendimentos([atendimento(1,{dataHoraFim:undefined}),atendimento(2,{dataHoraFim:undefined})])).toHaveLength(2);
 });
});
describe('cobertura e recibo', () => {
 it('cortesia e legado não são mensalidade por terem valor zero', () => {
  expect(ehMensalidade(atendimento(1,{valorCobrado:0,modalidadeCobranca:'AVULSO'}))).toBe(false);
  expect(ehMensalidade(atendimento(1,{valorCobrado:0,modalidadeCobranca:'LEGADO'}))).toBe(false);
  expect(ehMensalidade(atendimento(1,{valorCobrado:0,assinaturaId:9,modalidadeCobranca:'MENSALIDADE'}))).toBe(true);
 });
 it('emite apenas avulso pago positivo, excluindo mensalidade e pendente', () => {
  expect(podeEmitirReciboAtendimento(atendimento(1,{statusPagamento:'PAID',modalidadeCobranca:'AVULSO'}))).toBe(true);
  expect(podeEmitirReciboAtendimento(atendimento(1,{statusPagamento:'PAYMENT_PENDING'}))).toBe(false);
  expect(podeEmitirReciboAtendimento(atendimento(1,{statusPagamento:'PAID',valorCobrado:0}))).toBe(false);
  expect(podeEmitirReciboAtendimento(atendimento(1,{statusPagamento:'PAID',modalidadeCobranca:'MENSALIDADE'}))).toBe(false);
 });
});
