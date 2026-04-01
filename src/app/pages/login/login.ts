import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    if (!this.username || !this.password) {
      this.error.set('請輸入帳號和密碼');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
