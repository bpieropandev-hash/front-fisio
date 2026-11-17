import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AvaliacoesPacienteComponent } from './avaliacoes-paciente.component';
import { API_CONFIG } from '../../../core/config/api.config';

const url = `${API_CONFIG.baseUrl}/api/v1/pacientes/10/avaliacoes`;
const avaliacoes = [
  { id: 1, pacienteId: 10, dataAvaliacao: '2026-11-10', titulo: 'Avaliação inicial', observacao: 'Dor lombar', criadoEm: '2026-11-10T10:00:00', autor: 'Dra. Maria', nomeArquivo: 'ficha.pdf', tipoConteudo: 'application/pdf' },
  { id: 2, pacienteId: 10, dataAvaliacao: '2026-11-12', titulo: 'Postura', observacao: '', criadoEm: '2026-11-12T10:00:00', autor: 'Dra. Maria', nomeArquivo: 'foto.png', tipoConteudo: 'image/png' }
];

describe('AvaliacoesPacienteComponent', () => {
  let fixture: ComponentFixture<AvaliacoesPacienteComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AvaliacoesPacienteComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AvaliacoesPacienteComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('pacienteId', 10);
    fixture.componentRef.setInput('pacienteNome', 'Ana');
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify({ ignoreCancelled: true }); });

  function escolher(file: File) {
    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  function carregar() {
    http.expectOne(url).flush(avaliacoes);
    fixture.detectChanges();
  }

  it('lista avaliações com título, tipo e data', () => {
    carregar();
    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Avaliação inicial');
    expect(texto).toContain('10/11/2026');
    expect(texto).toContain('PDF');
    expect(texto).toContain('Imagem');
  });

  it('mostra estado vazio', () => {
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma avaliação física cadastrada.');
  });

  it('mostra erro e permite nova tentativa quando a lista falha', () => {
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.componentInstance.carregar();
    http.expectOne(url).flush([]);
  });

  it('rejeita arquivo de tipo não permitido sem chamar a API', () => {
    carregar();
    escolher(new File(['x'], 'x.html', { type: 'text/html' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.erro()).toContain('PDF');
    expect(fixture.componentInstance.nomeArquivo()).toBe('');
  });

  it('envia PDF como multipart e recarrega a lista', () => {
    carregar();
    escolher(new File(['%PDF-1.4'], 'ficha.pdf', { type: 'application/pdf' }));
    fixture.componentInstance.form.setValue({ dataAvaliacao: '2026-11-17', titulo: ' Reavaliação ', observacao: '' });
    fixture.componentInstance.enviar();
    const req = http.expectOne(r => r.method === 'POST' && r.url === url);
    const body = req.request.body as FormData;
    expect((body.get('arquivo') as File).name).toBe('ficha.pdf');
    expect(body.get('titulo')).toBe('Reavaliação');
    expect(body.get('dataAvaliacao')).toBe('2026-11-17');
    req.flush(avaliacoes[0]);
    http.expectOne(url).flush(avaliacoes);
    expect(fixture.componentInstance.sucesso()).toBe('Avaliação enviada.');
  });

  it('exclui somente após confirmação', () => {
    carregar();
    fixture.componentInstance.pedirExclusao(avaliacoes[0] as never);
    fixture.detectChanges();
    http.expectNone(`${url}/1`);
    fixture.componentInstance.confirmarExclusao();
    http.expectOne(`${url}/1`).flush(null);
    http.expectOne(url).flush([avaliacoes[1]]);
    expect(fixture.componentInstance.avaliacoes()).toHaveLength(1);
  });
});
