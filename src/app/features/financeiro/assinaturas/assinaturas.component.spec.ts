import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { AssinaturaResponseDTO } from "../../../core/interfaces/assinatura.interface";
import { AssinaturasComponent } from "./assinaturas.component";

describe("Cadastro de assinatura mensal", () => {
  let fixture: ComponentFixture<AssinaturasComponent>;
  let component: AssinaturasComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AssinaturasComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(AssinaturasComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.pacienteIdsSelecionados = [1];
    component.novaAssinatura = {
      servicoId: 2,
      valorMensal: 250,
      diaVencimento: 5,
    };
  });

  afterEach(() => vi.useRealTimers());

  it.each([0, -10, NaN])(
    "impede cobrança com valor mensal inválido: %s",
    (valorMensal) => {
      component.novaAssinatura.valorMensal = valorMensal;
      component.criarAssinatura();
      http.expectNone((r) => r.method === "POST");
      expect(component.salvando()).toBe(false);
    },
  );

  it.each([0, 29, 5.5])(
    "impede vencimento fora dos dias inteiros de 1 a 28: %s",
    (diaVencimento) => {
      component.novaAssinatura.diaVencimento = diaVencimento;
      component.criarAssinatura();
      http.expectNone((r) => r.method === "POST");
    },
  );

  it("não envia duas assinaturas quando o usuário repete o clique", () => {
    component.criarAssinatura();
    component.criarAssinatura();
    const req = http.expectOne((r) => r.method === "POST");
    expect(req.request.body).toMatchObject({
      pacienteIds: [1],
      servicoId: 2,
      valorMensal: 250,
      diaVencimento: 5,
    });
    req.flush({}, { status: 500, statusText: "Falha" });
    expect(component.pacienteIdsSelecionados).toEqual([1]);
    expect(component.novaAssinatura.valorMensal).toBe(250);
    expect(component.salvando()).toBe(false);
    http.verify();
  });
  it("mostra o erro do campo e o remove quando o valor é corrigido", () => {
    component.novaAssinatura.diaVencimento = 29;
    component.criarAssinatura();
    expect(component.erroCampo("nova", "dia")).toContain("entre 1 e 28");
    component.novaAssinatura.diaVencimento = 10;
    expect(component.erroCampo("nova", "dia")).toBe("");
  });

  it("rejeita uma data inexistente sem enviar a cobrança", () => {
    component.novaAssinatura.dataInicio = "2026-02-30";
    component.criarAssinatura();
    expect(component.erroCampo("nova", "data")).toContain("data válida");
    http.expectNone((r) => r.method === "POST");
  });

  it("diferencia falha de carregamento de uma lista vazia e permite nova tentativa", () => {
    component.carregarDados();
    http
      .expectOne((r) => r.url.endsWith("/assinaturas"))
      .flush({}, { status: 500, statusText: "Falha" });
    http
      .expectOne((r) => r.url.endsWith("/pacientes"))
      .flush({}, { status: 500, statusText: "Falha" });
    http
      .expectOne((r) => r.url.endsWith("/servicos"))
      .flush({}, { status: 500, statusText: "Falha" });
    expect(component.erroLista()).toContain("Não foi possível");
    expect(component.erroPacientes()).toContain("Não foi possível");
    expect(component.erroServicos()).toContain("Não foi possível");
    expect(component.carregandoPacientes()).toBe(false);
    component.carregarDados();
    http.expectOne((r) => r.url.endsWith("/assinaturas")).flush([]);
    http.expectOne((r) => r.url.endsWith("/pacientes")).flush([]);
    http.expectOne((r) => r.url.endsWith("/servicos")).flush([]);
    expect(component.erroLista()).toBe("");
    expect(component.erroPacientes()).toBe("");
    expect(component.erroServicos()).toBe("");
    http.verify();
  });

  it("fecha o modal após criar e atualiza a listagem", () => {
    component.modalVisivel = true;
    component.criarAssinatura();
    http.expectOne((r) => r.method === "POST").flush([{ id: 1 }]);
    expect(component.modalVisivel).toBe(false);
    expect(component.salvando()).toBe(false);
    http.expectOne((r) => r.url.endsWith("/assinaturas")).flush([]);
    http.expectOne((r) => r.url.endsWith("/pacientes")).flush([]);
    http.expectOne((r) => r.url.endsWith("/servicos")).flush([]);
    http.verify();
  });

  const assinatura: AssinaturaResponseDTO = {
    id: 1,
    pacienteId: 1,
    pacienteNome: "Paciente",
    servicoId: 2,
    servicoNome: "Pilates",
    valorMensal: 250,
    diaVencimento: 5,
    ativo: true,
    dataInicio: "2026-01-01",
  };

  it("aplica a mesma validação financeira ao editar e trocar plano", () => {
    component.abrirModalEditar(assinatura);
    component.edicao.valorMensal = -1;
    component.salvarEdicao();
    http.expectNone((r) => r.method === "PUT");
    expect(component.erroCampo("editar", "valor")).toContain("R$ 0,01");
    component.abrirModalTrocarPlano(assinatura);
    component.trocaPlano = {
      novoServicoId: 3,
      novoValorMensal: 250,
      diaVencimento: 29,
    };
    component.confirmarTrocarPlano();
    http.expectNone((r) => r.method === "POST");
    expect(component.erroCampo("trocar", "dia")).toContain("entre 1 e 28");
  });

  it("calcula o vencimento previsto respeitando a vigência e a virada do ano", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 27, 12));
    expect(component.proximoVencimento(assinatura)).toEqual(
      new Date(2027, 0, 5),
    );
    expect(
      component.proximoVencimento({ ...assinatura, dataInicio: "2027-02-10" }),
    ).toEqual(new Date(2027, 2, 5));
    expect(
      component.proximoVencimento({ ...assinatura, ativo: false }),
    ).toBeNull();
  });

  it("renderiza labels, data em largura total e erros junto aos controles no modal", async () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith("/assinaturas")).flush([]);
    http.expectOne((r) => r.url.endsWith("/pacientes")).flush([]);
    http.expectOne((r) => r.url.endsWith("/servicos")).flush([]);
    component.abrirModalNovaAssinatura();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(
      root.querySelector("#nova-data")?.classList.contains("full-width"),
    ).toBe(true);
    expect(root.querySelector('label[for="nova-data"]')?.textContent).toContain(
      "Data de início",
    );
    component.criarAssinatura();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector("#nova-pacientes-erro")?.textContent).toContain(
      "Selecione pelo menos um",
    );
    expect(root.querySelector("#nova-valor-erro")?.textContent).toContain(
      "R$ 0,01",
    );
    expect(
      root
        .querySelector(".p-dialog-footer .dialog-footer")
        ?.querySelectorAll("p-button").length,
    ).toBe(2);
    http.verify();
  });
});
