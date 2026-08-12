import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule, TooltipModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss'
})
export class SearchInputComponent {
  value = model<string>('');
  placeholder = input<string>('Pesquisar...');

  limpar(): void {
    this.value.set('');
  }
}
