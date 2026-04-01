import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { Match, BetSelection, BetItem, PlacedBet, BetMode } from '../models/match.model';

@Injectable({ providedIn: 'root' })
export class BetService {
  betItems = signal<BetItem[]>([]);
  balance = signal<number>(50000);
  placedBets = signal<PlacedBet[]>([]);
  betMode = signal<BetMode>('single');
  parlayStake = signal<number>(0);

  /** 結算通知，供 UI 顯示 toast */
  settleNotify$ = new Subject<{ bet: PlacedBet; result: 'won' | 'lost' }>();

  private settleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  totalStake = computed(() => {
    if (this.betMode() === 'parlay') return this.parlayStake();
    return this.betItems().reduce((sum, item) => sum + (item.stake || 0), 0);
  });

  parlayOdds = computed(() =>
    parseFloat(
      this.betItems()
        .reduce((product, item) => product * item.odds, 1)
        .toFixed(2)
    )
  );

  totalPotentialWin = computed(() => {
    if (this.betMode() === 'parlay') {
      return parseFloat((this.parlayStake() * this.parlayOdds()).toFixed(0));
    }
    return this.betItems().reduce((sum, item) => sum + (item.stake || 0) * item.odds, 0);
  });

  switchMode(mode: BetMode): void {
    this.betMode.set(mode);
    this.parlayStake.set(0);
  }

  addBet(match: Match, selection: BetSelection): void {
    const selectionLabels: Record<BetSelection, string> = {
      home: '主隊勝',
      draw: '平局',
      away: '客隊勝',
    };

    const existingIndex = this.betItems().findIndex(
      b => b.matchId === match.id && b.selection === selection
    );

    if (existingIndex !== -1) {
      this.betItems.update(items => items.filter((_, i) => i !== existingIndex));
      return;
    }

    const odds = match.odds[selection];
    if (odds === null) return;

    const newItem: BetItem = {
      id: `${match.id}-${selection}-${Date.now()}`,
      matchId: match.id,
      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
      selection,
      selectionLabel: selectionLabels[selection],
      odds,
      stake: 0,
    };

    this.betItems.update(items => {
      const filtered = items.filter(b => b.matchId !== match.id);
      return [...filtered, newItem];
    });

    // 選到第 2 場時自動切換到過關
    if (this.betItems().length >= 2) {
      this.betMode.set('parlay');
    }
  }

  removeBet(id: string): void {
    this.betItems.update(items => items.filter(b => b.id !== id));

    // 剩下不足 2 場時自動切回單場
    if (this.betItems().length < 2) {
      this.betMode.set('single');
      this.parlayStake.set(0);
    }
  }

  updateStake(id: string, stake: number): void {
    this.betItems.update(items =>
      items.map(b => b.id === id ? { ...b, stake: Math.max(0, stake) } : b)
    );
  }

  updateParlayStake(stake: number): void {
    this.parlayStake.set(Math.max(0, stake));
  }

  placeBets(): boolean {
    const items = this.betItems();
    const total = this.totalStake();

    if (items.length === 0 || total <= 0) return false;
    if (total > this.balance()) return false;

    if (this.betMode() === 'parlay') {
      if (items.length < 2) return false;

      const combinedOdds = this.parlayOdds();
      const stake = this.parlayStake();
      const potentialWin = parseFloat((stake * combinedOdds).toFixed(0));
      const legs = items.map(item => ({
        matchName: item.matchName,
        selectionLabel: item.selectionLabel,
        odds: item.odds,
      }));
      const count = items.length;

      const parlayBet: PlacedBet = {
        id: `parlay-${Date.now()}`,
        matchId: 'parlay',
        matchName: `${count} 串 1 過關`,
        selection: 'home',
        selectionLabel: `${count} 串 1`,
        odds: combinedOdds,
        stake,
        placedAt: new Date(),
        status: 'pending',
        potentialWin,
        isParlay: true,
        parlayLegs: legs,
        combinedOdds,
      };

      this.placedBets.update(prev => [parlayBet, ...prev]);
      this.balance.update(b => b - stake);
      this.betItems.set([]);
      this.parlayStake.set(0);
      this.scheduleSettle(parlayBet);
      return true;
    }

    // 單場模式
    const newPlaced: PlacedBet[] = items
      .filter(item => item.stake > 0)
      .map(item => ({
        ...item,
        placedAt: new Date(),
        status: 'pending' as const,
        potentialWin: parseFloat((item.stake * item.odds).toFixed(0)),
      }));

    if (newPlaced.length === 0) return false;

    this.placedBets.update(prev => [...newPlaced, ...prev]);
    this.balance.update(b => b - newPlaced.reduce((s, i) => s + i.stake, 0));
    this.betItems.set([]);
    newPlaced.forEach(bet => this.scheduleSettle(bet));
    return true;
  }

  private scheduleSettle(bet: PlacedBet): void {
    // 過關勝率較低（20%），單場 40%
    const winRate = bet.isParlay ? 0.2 : 0.4;
    const timer = setTimeout(() => {
      const result: 'won' | 'lost' = Math.random() < winRate ? 'won' : 'lost';

      this.placedBets.update(bets =>
        bets.map(b => b.id === bet.id ? { ...b, status: result } : b)
      );

      if (result === 'won') {
        this.balance.update(b => b + bet.potentialWin);
      }

      this.settleNotify$.next({ bet, result });
      this.settleTimers.delete(bet.id);
    }, 15000);

    this.settleTimers.set(bet.id, timer);
  }

  clearBets(): void {
    this.betItems.set([]);
    this.parlayStake.set(0);
  }

  isSelected(matchId: string, selection: BetSelection): boolean {
    return this.betItems().some(
      b => b.matchId === matchId && b.selection === selection
    );
  }
}
