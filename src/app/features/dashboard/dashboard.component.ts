import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResumoDTO } from '../../core/interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    
    <div class="dashboard-header">
      <h2>Dashboard</h2>
      <p class="subtitle">Visão geral e alertas do mês atual</p>
    </div>

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
      margin-bottom: 2rem;
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
  `]
})
export class DashboardComponent implements OnInit {
  carregando = signal(true);
  resumo = signal<DashboardResumoDTO | null>(null);

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
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
