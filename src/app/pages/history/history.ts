import { Component, inject } from '@angular/core';
import { BetService } from '../../services/bet.service';
import { PlacedBet } from '../../models/match.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History {
  private betService = inject(BetService);

  get placedBets(): PlacedBet[] {
    return this.betService.placedBets();
  }

  formatDate(date: Date): string {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatNumber(n: number): string {
    return n.toLocaleString('zh-TW');
  }

  statusLabel(status: PlacedBet['status']): string {
    const labels = { pending: '待結果', won: '勝', lost: '敗' };
    return labels[status];
  }

  totalStake(): number {
    return this.placedBets.reduce((s, b) => s + b.stake, 0);
  }
}
