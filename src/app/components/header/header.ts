import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { BetService } from '../../services/bet.service';
import { PlacedBet } from '../../models/match.model';

interface Toast {
  id: number;
  result: 'won' | 'lost';
  matchName: string;
  amount: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  private betService = inject(BetService);
  private sub!: Subscription;
  private toastIdCounter = 0;

  toasts = signal<Toast[]>([]);

  get balance() { return this.betService.balance(); }
  get betCount() { return this.betService.betItems().length; }

  ngOnInit(): void {
    this.sub = this.betService.settleNotify$.subscribe(({ bet, result }) => {
      this.showToast(bet, result);
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private showToast(bet: PlacedBet, result: 'won' | 'lost'): void {
    const toast: Toast = {
      id: ++this.toastIdCounter,
      result,
      matchName: bet.matchName,
      amount: result === 'won' ? bet.potentialWin : bet.stake,
    };
    this.toasts.update(t => [toast, ...t]);
    setTimeout(() => {
      this.toasts.update(t => t.filter(x => x.id !== toast.id));
    }, 4500);
  }

  formatBalance(n: number): string {
    return n.toLocaleString('zh-TW');
  }
}
