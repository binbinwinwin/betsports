import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService, API } from '../../services/auth.service';
import { BetService } from '../../services/bet.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css',
})
export class Transaction implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  betService = inject(BetService);

  type = signal<'deposit' | 'withdraw'>('deposit');
  amount = 0;
  loading = signal(false);
  error = signal('');
  success = signal('');

  quickAmounts = [1000, 5000, 10000, 50000];

  ngOnInit(): void {
    const path = this.route.snapshot.url[0]?.path;
    this.type.set(path === 'withdraw' ? 'withdraw' : 'deposit');
  }

  setQuick(amount: number): void {
    this.amount = amount;
  }

  submit(): void {
    if (!this.amount || this.amount <= 0) {
      this.error.set('請輸入有效金額');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const endpoint = this.type() === 'deposit' ? 'deposit' : 'withdraw';
    this.http.post<{ balance: number }>(`${API}/user/${endpoint}`, { amount: this.amount })
      .pipe(
        catchError(err => {
          this.loading.set(false);
          this.error.set(err.error?.detail ?? '操作失敗');
          return throwError(() => err);
        })
      )
      .subscribe(({ balance }) => {
        this.loading.set(false);
        this.betService.balance.set(balance);
        this.success.set(
          this.type() === 'deposit'
            ? `入金成功 NT$ ${this.amount.toLocaleString('zh-TW')}`
            : `出金成功 NT$ ${this.amount.toLocaleString('zh-TW')}`
        );
        this.amount = 0;
      });
  }
}
