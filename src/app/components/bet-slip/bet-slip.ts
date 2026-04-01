import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BetService } from '../../services/bet.service';
import { BetItem, BetMode } from '../../models/match.model';

@Component({
  selector: 'app-bet-slip',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bet-slip.html',
  styleUrl: './bet-slip.css',
})
export class BetSlip {
  betService = inject(BetService);
  successMsg = signal(false);

  get betItems() { return this.betService.betItems(); }
  get totalStake() { return this.betService.totalStake(); }
  get totalPotentialWin() { return this.betService.totalPotentialWin(); }
  get balance() { return this.betService.balance(); }
  get betMode() { return this.betService.betMode(); }
  get parlayOdds() { return this.betService.parlayOdds(); }
  get parlayStake() { return this.betService.parlayStake(); }
  get validCount() { return this.betService.betItems().filter(b => b.stake > 0).length; }
  get emptyCount() { return this.betService.betItems().filter(b => b.stake <= 0).length; }

  switchMode(mode: BetMode): void {
    this.betService.switchMode(mode);
  }

  removeBet(id: string): void {
    this.betService.removeBet(id);
  }

  updateStake(item: BetItem, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.betService.updateStake(item.id, isNaN(val) ? 0 : val);
  }

  updateParlayStake(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.betService.updateParlayStake(isNaN(val) ? 0 : val);
  }

  placeBets(): void {
    const ok = this.betService.placeBets();
    if (ok) {
      this.successMsg.set(true);
      setTimeout(() => this.successMsg.set(false), 3000);
    }
  }

  clearBets(): void {
    this.betService.clearBets();
  }

  potentialWin(item: BetItem): number {
    return parseFloat((item.stake * item.odds).toFixed(0));
  }

  formatNumber(n: number): string {
    return n.toLocaleString('zh-TW');
  }
}
