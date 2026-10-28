import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FotosPacienteComponent } from './fotos-paciente.component';
import { API_CONFIG } from '../../../core/config/api.config';
const base = `${API_CONFIG.baseUrl}/api/v1/pacientes`;
const fotos = [1,2,3].map(id => ({ id, pacienteId: 10, dataCaptura: `2026-10-0${id}`, regiao: 'Coluna', observacao: 'Vista lateral', criadoEm: '2026-10-26T10:00:00', autor: 'Dra. Maria' }));
describe('FotosPacienteComponent', () => {
  let fixture: ComponentFixture<FotosPacienteComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    vi.stubGlobal('URL', class extends URL { static override createObjectURL = vi.fn(() => 'blob:privada'); static override revokeObjectURL = vi.fn(); });
    TestBed.configureTestingModule({ imports: [FotosPacienteComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(FotosPacienteComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('pacienteId', 10);
    fixture.componentRef.setInput('pacienteNome', 'Ana');
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); http.verify({ignoreCancelled:true}); vi.unstubAllGlobals(); });
  function carregar() {
    http.expectOne(`${base}/10/fotos`).flush(fotos);
    for (const foto of fotos) {
      const req = http.expectOne(`${base}/10/fotos/${foto.id}/imagem`);
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['imagem'], { type: 'image/png' }));
    }
    fixture.detectChanges();
  }
  it('compara apenas duas fotos selecionadas e mantém datas e região', () => {
    carregar();
    fixture.componentInstance.selecionarComparacao(1);
    fixture.componentInstance.selecionarComparacao(2);
    fixture.componentInstance.selecionarComparacao(3);
    fixture.detectChanges();
    const compare = fixture.nativeElement.querySelector('[aria-label="Comparação de fotos"]');
    expect(compare.querySelectorAll('figure')).toHaveLength(2);
    expect(compare.textContent).toContain('01/10/2026');
    expect(compare.textContent).toContain('02/10/2026');
    expect(compare.textContent).not.toContain('03/10/2026');
    expect(compare.textContent).toContain('Coluna');
  });
  it('troca de paciente descarta comparação e revoga imagens privadas', () => {
    carregar();
    fixture.componentInstance.selecionarComparacao(1);
    fixture.componentInstance.selecionarComparacao(2);
    fixture.componentRef.setInput('pacienteId', 20);
    fixture.detectChanges();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    http.expectOne(`${base}/20/fotos`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Comparação de fotos"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('img')).toHaveLength(0);
  });
  it('exibe erro da galeria e permite nova tentativa', () => {
    http.expectOne(`${base}/10/fotos`).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.componentInstance.carregar();
    http.expectOne(`${base}/10/fotos`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma foto');
  });
  it('rejeita tipo e tamanho inválidos antes do upload', () => {
    http.expectOne(`${base}/10/fotos`).flush([]);
    for (const file of [new File(['x'], 'exame.pdf', { type: 'application/pdf' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })]) {
      fixture.componentInstance.selecionarArquivo({ target: { files: [file] } } as unknown as Event);
      fixture.componentInstance.enviar();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      http.expectNone(req => req.method === 'POST');
    }
  });
  it('envia imagem e metadados em multipart autenticado e limpa o arquivo', () => {
    http.expectOne(`${base}/10/fotos`).flush([]);
    fixture.detectChanges();
    const file = new File(['imagem'], 'foto.png', { type: 'image/png' });
    fixture.componentInstance.selecionarArquivo({ target: { files: [file] } } as unknown as Event);
    const data = fixture.nativeElement.querySelector('[name="dataCaptura"]') as HTMLInputElement;
    data.value = '01/10/2026'; data.dispatchEvent(new Event('input'));
    const regiao = fixture.nativeElement.querySelector('[name="regiao"]') as HTMLInputElement;
    regiao.value = 'Coluna'; regiao.dispatchEvent(new Event('input'));
    fixture.componentInstance.enviar();
    const req = http.expectOne(`${base}/10/fotos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect(req.request.body.get('imagem').name).toBe('foto.png');
    expect(req.request.body.get('dataCaptura')).toBe('2026-10-01');
    expect(req.request.body.get('regiao')).toBe('Coluna');
    req.flush(fotos[0]);
    http.expectOne(`${base}/10/fotos`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Foto enviada');
  });
  it('só exclui a foto após confirmar e usa o paciente atual na API', () => {
    carregar();
    const excluir = fixture.nativeElement.querySelector('[aria-label="Excluir foto de 01/10/2026"]') as HTMLButtonElement;
    excluir.click();
    fixture.detectChanges();
    http.expectNone(req => req.method === 'DELETE');
    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    (dialog.querySelector('[data-confirmar-exclusao]') as HTMLButtonElement).click();
    const req = http.expectOne(`${base}/10/fotos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    http.expectOne(`${base}/10/fotos`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('img')).toHaveLength(0);
  });
  it('revoga URLs no fechamento e cancela imagens ainda em trânsito', () => {
    http.expectOne(`${base}/10/fotos`).flush(fotos);
    http.expectOne(`${base}/10/fotos/1/imagem`).flush(new Blob(['imagem']));
    const pendente = http.expectOne(`${base}/10/fotos/2/imagem`);
    http.expectOne(`${base}/10/fotos/3/imagem`);
    fixture.destroy();
    expect(pendente.cancelled).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:privada');
  });
});
