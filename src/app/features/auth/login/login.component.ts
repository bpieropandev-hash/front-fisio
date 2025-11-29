import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule
  ],
  providers: [MessageService],
  template: `
    <div class="login-container">
      <p-card styleClass="login-card">
        <ng-template pTemplate="header">
          <div class="login-header">
            <h1>Physio Manager</h1>
            <p>Faça login para continuar</p>
          </div>
        </ng-template>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="login">Login</label>
            <input
              style="width: 100%;"
              id="login"
              type="text"
              pInputText
              formControlName="login"
              placeholder="Digite seu login"
              [class.ng-invalid]="loginForm.get('login')?.invalid && loginForm.get('login')?.touched"
            />
            @if (loginForm.get('login')?.invalid && loginForm.get('login')?.touched) {
              <small class="error-text">Login é obrigatório</small>
            }
          </div>

          <div class="form-group">
            <label for="senha">Senha</label>
            <p-password
              id="senha"
              formControlName="senha"
              placeholder="Digite sua senha"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="full-width"
              [inputStyle]="{ width: '100%' }"
            />
            @if (loginForm.get('senha')?.invalid && loginForm.get('senha')?.touched) {
              <small class="error-text">Senha é obrigatória</small>
            }
          </div>

          <p-button
            type="submit"
            label="Entrar"
            [loading]="loading()"
            [disabled]="loginForm.invalid"
            styleClass="full-width"
          />
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
    }

    .login-header {
      text-align: center;
      padding: 20px 0;
    }

    .login-header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .login-header p {
      margin: 0;
      color: #666;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .full-width {
      width: 100%;
    }

    .error-text {
      color: #e24c4c;
      font-size: 12px;
      display: block;
      margin-top: 4px;
    }

    ::ng-deep .p-password {
      width: 100%;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      login: ['', Validators.required],
      senha: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.router.navigate(['/agenda']);
        },
        error: (error) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: error.error?.message || 'Credenciais inválidas'
          });
        }
      });
    }
  }
}


