import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResumoDTO } from '../../core/interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    DatePickerModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="dashboard-header">
      <div>
        <h2>Dashboard</h2>
        <p class="subtitle">Visão geral e alertas do mês atual</p>
      </div>
      <p-button
        [label]="filtrosVisiveis() ? 'Ocultar Filtros' : 'Filtros'"
        [icon]="filtrosVisiveis() ? 'pi pi-times' : 'pi pi-filter'"
        (onClick)="toggleFiltros()"
        [outlined]="!filtrosVisiveis()"
      />
    </div>

    <!-- Painel de Filtros (Oculto por padrão) -->
    @if (filtrosVisiveis()) {
      <p-card class="filters-card">
        <div class="filters-header">
          <h3>
            <i class="pi pi-filter"></i>
            Filtros de Período
          </h3>
        </div>
        
        <div class="filters-grid">
          <div class="filter-group">
            <label>Data Início</label>
            <p-datepicker
              [(ngModel)]="filtros.dataInicio"
              dateFormat="dd/mm/yy"
              [showTime]="false"
              styleClass="full-width"
              placeholder="Selecione a data inicial"
            />
          </div>

          <div class="filter-group">
            <label>Data Fim</label>
            <p-datepicker
              [(ngModel)]="filtros.dataFim"
              dateFormat="dd/mm/yy"
              [showTime]="false"
              styleClass="full-width"
              placeholder="Selecione a data final"
            />
          </div>

          <div class="filter-group filter-actions">
            <p-button
              label="Limpar Filtros"
              icon="pi pi-times"
              (onClick)="limparFiltros()"
              styleClass="p-button-text"
            />
            <p-button
              label="Aplicar Filtros"
              icon="pi pi-check"
              (onClick)="aplicarFiltros()"
            />
          </div>
        </div>
      </p-card>
    }

    @if (carregando()) {
      <div class="loading-container">
        <p-progressSpinner />
      </div>
    } @else {
      <!-- Cards de Resumo -->
      <div class="summary-cards">
        <p-card class="summary-card">
          <div class="card-content">
            <div class="card-icon total">
              <i class="pi pi-calendar-check"></i>
            </div>
            <div class="card-info">
              <h3>Total de Atendimentos Concluídos</h3>
              <p class="card-value">{{ resumo()?.totalAtendimentos || 0 }}</p>
              <small class="card-label">Mês atual</small>
            </div>
          </div>
        </p-card>

        <p-card class="summary-card">
          <div class="card-content">
            <div class="card-icon revenue">
              <i class="pi pi-dollar"></i>
            </div>
            <div class="card-info">
              <h3>Faturamento Profissional</h3>
              <p class="card-value">{{ (resumo()?.faturamentoProfissional || 0) | currency: 'BRL' }}</p>
              <small class="card-label">Mês atual</small>
            </div>
          </div>
        </p-card>

        <p-card class="summary-card">
          <div class="card-content">
            <div class="card-icon alerts">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="card-info">
              <h3>Alertas</h3>
              <p class="card-value">{{ resumo()?.alertasPendencia?.length || 0 }}</p>
              <small class="card-label">Pendências financeiras</small>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Tabela de Alertas -->
      @if (resumo()?.alertasPendencia && resumo()!.alertasPendencia.length > 0) {
        <p-card class="alerts-card">
          <ng-template pTemplate="header">
            <div class="card-header">
              <h3>
                <i class="pi pi-exclamation-triangle"></i>
                Alertas de Pendências Financeiras
              </h3>
            </div>
          </ng-template>
          
          <p-table
            [value]="resumo()!.alertasPendencia"
            [tableStyle]="{ 'min-width': '50rem' }"
            styleClass="p-datatable-striped"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Paciente</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-pacienteNome>
              <tr>
                <td>
                  <strong>{{ pacienteNome }}</strong>
                </td>
                <td>
                  <p-tag value="Pendente" severity="warn" />
                </td>
                <td>
                  <p-button
                    label="Resolver"
                    icon="pi pi-arrow-right"
                    (onClick)="resolverAlerta()"
                    styleClass="p-button-sm"
                  />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="empty">
              <tr>
                <td colspan="3" class="text-center">Nenhum alerta encontrado</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      } @else {
        <p-card class="no-alerts-card">
          <div class="no-alerts-content">
            <i class="pi pi-check-circle"></i>
            <h3>Nenhum alerta encontrado</h3>
            <p>Todos os pacientes mensalistas possuem cobranças pagas no mês atual.</p>
          </div>
        </p-card>
      }
    }
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1rem;
    }

    .dashboard-header ::ng-deep .p-button {
      height: 2.5rem !important;
      min-height: 2.5rem !important;
      padding: 0.625rem 1.25rem !important;
    }

    .dashboard-header h2 {
      margin: 0 0 0.5rem 0;
      color: #1e293b;
      font-size: 2rem;
      font-weight: 600;
    }

    .dashboard-header .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 1rem;
    }

    .filters-card {
      margin-bottom: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .filters-header {
      margin-bottom: 1.5rem;
    }

    .filters-header h3 {
      margin: 0;
      color: #1e293b;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filters-header i {
      color: #64748b;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      align-items: end;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-group label {
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #1e293b;
      font-size: 0.875rem;
    }

    .filter-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .full-width {
      width: 100%;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }

    .card-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
    }

    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      color: white;
    }

    .card-icon.total {
      background: linear-gradient(135deg, #4cc9f0 0%, #90f7ec 100%);
    }

    .card-icon.revenue {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .card-icon.alerts {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .card-info {
      flex: 1;
    }

    .card-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      margin: 0 0 0.25rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: #1e293b;
    }

    .card-label {
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .alerts-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .card-header {
      padding: 1.5rem;
    }

    .card-header h3 {
      margin: 0;
      color: #1e293b;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-header i {
      color: #f59e0b;
    }

    .no-alerts-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .no-alerts-content {
      text-align: center;
      padding: 3rem 2rem;
    }

    .no-alerts-content i {
      font-size: 4rem;
      color: #10b981;
      margin-bottom: 1rem;
    }

    .no-alerts-content h3 {
      margin: 0 0 0.5rem 0;
      color: #1e293b;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .no-alerts-content p {
      margin: 0;
      color: #64748b;
      font-size: 1rem;
    }

    .text-center {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
      }

      .dashboard-header h2 {
        font-size: 1.5rem;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .filter-actions {
        flex-direction: column-reverse;
      }

      .filter-actions .p-button {
        width: 100%;
      }

      .summary-cards {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .card-content {
        gap: 1rem;
        padding: 0.75rem;
      }

      .card-icon {
        width: 48px;
        height: 48px;
        font-size: 1.25rem;
      }

      .card-value {
        font-size: 1.5rem;
      }

      .card-header {
        padding: 1rem;
      }

      .card-header h3 {
        font-size: 1rem;
      }

      ::ng-deep .p-datatable {
        font-size: 0.875rem;
      }

      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem !important;
        font-size: 0.75rem !important;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }
    }

    @media (max-width: 480px) {
      .dashboard-header h2 {
        font-size: 1.25rem;
      }

      .card-content {
        flex-direction: column;
        text-align: center;
      }

      .card-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto;
      }

      .card-value {
        font-size: 1.25rem;
      }

      .no-alerts-content {
        padding: 2rem 1rem;
      }

      .no-alerts-content i {
        font-size: 3rem;
      }

      .no-alerts-content h3 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  carregando = signal(true);
  resumo = signal<DashboardResumoDTO | null>(null);
  filtrosVisiveis = signal(false);
  
  filtros = {
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  toggleFiltros(): void {
    this.filtrosVisiveis.set(!this.filtrosVisiveis());
  }

  limparFiltros(): void {
    this.filtros = {
      dataInicio: null,
      dataFim: null
    };
    this.carregarDados();
  }

  aplicarFiltros(): void {
    // Validação básica
    if (this.filtros.dataInicio && this.filtros.dataFim) {
      if (this.filtros.dataInicio > this.filtros.dataFim) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenção',
          detail: 'A data de início deve ser anterior à data de fim'
        });
        return;
      }
    }

    // Por enquanto, apenas recarrega os dados
    // Quando o backend suportar filtros por período, passar os parâmetros aqui
    this.carregarDados();
    
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros aplicados',
      detail: 'Os filtros foram aplicados (funcionalidade em desenvolvimento)'
    });
  }

  carregarDados(): void {
    this.carregando.set(true);

    this.dashboardService.buscarResumo().subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar resumo do dashboard:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar dados do dashboard'
        });
        this.carregando.set(false);
      }
    });
  }

  resolverAlerta(): void {
    this.router.navigate(['/financeiro/cobrancas']);
  }
}
