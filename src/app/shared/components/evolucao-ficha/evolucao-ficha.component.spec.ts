import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EvolucaoFichaComponent, EvolucaoFichaEstado } from './evolucao-ficha.component';
import { API_CONFIG } from '../../../core/config/api.config';
const base = `${API_CONFIG.baseUrl}/api/v1/agendamentos`;
const vazia = { versao: 0, procedimentos: [], equipamentos: [], pressaoSistolica: null, pressaoDiastolica: null, dor: null, observacoes: '', resumo: 'Texto anterior preservado', autor: null, atualizadoEm: null };
describe('EvolucaoFichaComponent', () => {
  let fixture: ComponentFixture<EvolucaoFichaComponent>;
  let http: HttpTestingController;
  let estados: EvolucaoFichaEstado[];
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EvolucaoFichaComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(EvolucaoFichaComponent);
    http = TestBed.inject(HttpTestingController);
    estados = [];
    fixture.componentInstance.estadoAlterado.subscribe(estado => estados.push(estado));
    fixture.componentRef.setInput('atendimentoId', 10);
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify({ignoreCancelled:true}); });
  function carregar() { http.expectOne(`${base}/10/evolucao-estruturada`).flush(vazia); fixture.detectChanges(); }
  it('exige pressão válida somente quando marcada e limpa valores ao desmarcar', () => {
    carregar();
    const form = fixture.componentInstance.form;
    form.controls.procedimentos.setValue(['PRESSAO_ARTERIAL']);
    expect(form.invalid).toBe(true);
    form.patchValue({ pressaoSistolica: 80, pressaoDiastolica: 90 });
    expect(form.invalid).toBe(true);
    form.patchValue({ pressaoSistolica: 120, pressaoDiastolica: 80 });
    expect(form.valid).toBe(true);
    form.controls.procedimentos.setValue([]);
    expect(form.controls.pressaoSistolica.value).toBeNull();
    expect(form.controls.pressaoDiastolica.value).toBeNull();
    expect(form.valid).toBe(true);
  });
  it('envia somente seleções da sessão e emite o resumo persistido', () => {
    carregar();
    let resumo = '';
    fixture.componentInstance.salva.subscribe(value => resumo = value);
    fixture.componentInstance.form.patchValue({ procedimentos: ['PILATES'], equipamentos: ['REFORMER', 'SOLO'], dor: 3, observacoes: 'Boa tolerância' });
    fixture.componentInstance.salvar();
    const req = http.expectOne(`${base}/10/evolucao-estruturada`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ versao: 0, procedimentos: ['PILATES'], equipamentos: ['REFORMER', 'SOLO'], pressaoSistolica: null, pressaoDiastolica: null, dor: 3, observacoes: 'Boa tolerância' });
    req.flush({ ...vazia, versao: 1, resumo: 'Pilates; Reformer, Solo' });
    expect(resumo).toBe('Pilates; Reformer, Solo');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pilates; Reformer, Solo');
  });
  it('mostra falha de carregamento com opção de tentar novamente', () => {
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Tentar novamente')) as HTMLButtonElement;
    expect(retry).toBeDefined();
    retry.click();
    http.expectOne(`${base}/10/evolucao-estruturada`).flush(vazia);
  });
  it('não sobrescreve conflito e conserva o preenchimento para revisão', () => {
    carregar();
    fixture.componentInstance.form.controls.observacoes.setValue('Texto não salvo');
    fixture.componentInstance.salvar();
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('outro profissional');
    expect(fixture.componentInstance.form.controls.observacoes.value).toBe('Texto não salvo');
  });
  it('troca de atendimento cancela histórico pendente e não copia seleções', () => {
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({ ...vazia, versao: 2, procedimentos: ['PILATES'] });
    fixture.componentInstance.carregarHistorico();
    const historico = http.expectOne(`${base}/10/evolucao-estruturada/historico`);
    fixture.componentRef.setInput('atendimentoId', 11);
    fixture.detectChanges();
    expect(historico.cancelled).toBe(true);
    http.expectOne(`${base}/11/evolucao-estruturada`).flush(vazia);
    expect(fixture.componentInstance.form.controls.procedimentos.value).toEqual([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Versão 2');
  });
  it('exibe histórico com autoria e versão sem alterar a ficha atual', () => {
    carregar();
    fixture.componentInstance.carregarHistorico();
    http.expectOne(`${base}/10/evolucao-estruturada/historico`).flush([{ ...vazia, versao: 1, autor: 'Dra. Maria', atualizadoEm: '2026-10-26T10:00:00', resumo: 'Fortalecimento' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dra. Maria');
    expect(fixture.nativeElement.textContent).toContain('Fortalecimento');
    expect(fixture.componentInstance.form.controls.procedimentos.value).toEqual([]);
  });
  it('informa carregamento e alterações reais ao pai, incluindo desfazer seleção', () => {
    expect(estados.at(-1)).toEqual({ dirty: false, carregando: true, salvando: false, conflito: false, carregado: false, versao: 0, resumo: '' });
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({ ...vazia, versao: 2, procedimentos: ['PILATES', 'ALONGAMENTO'] });
    expect(estados.at(-1)).toEqual({ dirty: false, carregando: false, salvando: false, conflito: false, carregado: true, versao: 2, resumo: 'Texto anterior preservado' });
    fixture.componentInstance.form.controls.observacoes.setValue('Complemento não salvo');
    expect(estados.at(-1)?.dirty).toBe(true);
    fixture.componentInstance.form.controls.observacoes.setValue('');
    expect(estados.at(-1)?.dirty).toBe(false);
    fixture.componentInstance.alternarProcedimento('PILATES');
    expect(estados.at(-1)?.dirty).toBe(true);
    fixture.componentInstance.alternarProcedimento('PILATES');
    expect(estados.at(-1)?.dirty).toBe(false);
  });
  it('informa gravação pendente e só libera o pai com a versão e o resumo persistidos', () => {
    carregar();
    fixture.componentInstance.form.controls.observacoes.setValue('Complemento');
    fixture.componentInstance.salvar();
    expect(estados.at(-1)).toMatchObject({ dirty: true, salvando: true, carregado: true, versao: 0 });
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({ ...vazia, versao: 1, observacoes: 'Complemento', resumo: 'Resumo novo' });
    expect(estados.at(-1)).toEqual({ dirty: false, carregando: false, salvando: false, conflito: false, carregado: true, versao: 1, resumo: 'Resumo novo' });
  });
  it('mantém bloqueio após conflito e publica a fonte atualizada depois de recarregar', () => {
    carregar();
    fixture.componentInstance.form.controls.observacoes.setValue('Não persistido');
    fixture.componentInstance.salvar();
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(estados.at(-1)).toMatchObject({ dirty: true, salvando: false, conflito: true });
    fixture.componentInstance.carregar();
    expect(estados.at(-1)).toMatchObject({ dirty: false, carregando: true, carregado: false });
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({ ...vazia, versao: 3, resumo: 'Texto de outro profissional' });
    expect(estados.at(-1)).toMatchObject({ dirty: false, carregado: true, conflito: false, versao: 3, resumo: 'Texto de outro profissional' });
  });
  it('avisa ao pai que uma ficha com erro de carga não está pronta para concluir', () => {
    http.expectOne(`${base}/10/evolucao-estruturada`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(estados.at(-1)).toMatchObject({ dirty: false, carregado: false, carregando: false });
  });

});
