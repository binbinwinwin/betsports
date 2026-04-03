import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  ts = inject(TranslationService);

  username = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set(this.ts.t('register.errorFillAll'));
      return;
    }
    if (this.username.length < 3) {
      this.error.set(this.ts.t('register.errorMinUser'));
      return;
    }
    if (this.password.length < 5) {
      this.error.set(this.ts.t('register.errorMinPw'));
      return;
    }
    if (!/[a-zA-Z]/.test(this.password) || !/[0-9]/.test(this.password)) {
      this.error.set(this.ts.t('register.errorPwFormat'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set(this.ts.t('register.errorMismatch'));
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.username, this.password, this.username).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
