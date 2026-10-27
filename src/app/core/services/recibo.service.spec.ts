import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReciboService } from './recibo.service';
import { API_CONFIG } from '../config/api.config';
describe('ReciboService', () => {
 let service: ReciboService; let http: HttpTestingController;
 beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}); service=TestBed.inject(ReciboService); http=TestBed.inject(HttpTestingController); });
 it('baixa o PDF autenticado como Blob', () => {
  const pdf = new Blob(['pdf'],{type:'application/pdf'}); let resultado: Blob | undefined;
  service.baixarPdf(8).subscribe(blob => resultado=blob);
  const req=http.expectOne(`${API_CONFIG.baseUrl}/api/v1/recibos/8/pdf`);
  expect(req.request.responseType).toBe('blob'); req.flush(pdf); expect(resultado).toBe(pdf); http.verify();
 });
 it('consulta recibos pela origem antes de permitir reimpressão', () => {
  service.listar({cobrancaId:4}).subscribe();
  const req=http.expectOne(`${API_CONFIG.baseUrl}/api/v1/recibos?cobrancaId=4`); expect(req.request.method).toBe('GET'); req.flush([]); http.verify();
 });
});
