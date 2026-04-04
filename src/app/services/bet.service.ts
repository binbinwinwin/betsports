import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Match, BetSelection, BetItem, PlacedBet, BetMode } from '../models/match.model';
import { AuthService, API } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BetService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  betItems = signal<BetItem[]>([]);
  balance = signal<number>(0);
  totalDeposited = signal<number>(0);
  placedBets = signal<PlacedBet[]>([]);
  betMode = signal<BetMode>('single');
  parlayStake = signal<number>(0);

  memberTier = computed(() => {
    const d = this.totalDeposited();
    if (d >= 500000) return 'diamond';
    if (d >= 100000) return 'vip';
    if (d >= 50000) return 'premium';
    return 'normal';
  });

  settleNotify$ = new Subject<{ bet: PlacedBet; result: 'won' | 'lost' }>();
  private settleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  totalStake = computed(() => {
    if (this.betMode() === 'parlay') return this.parlayStake();
    return this.betItems().reduce((sum, item) => sum + (item.stake || 0), 0);
  });

  parlayOdds = computed(() =>
    parseFloat(this.betItems().reduce((p, item) => p * item.odds, 1).toFixed(2))
  );

  totalPotentialWin = computed(() => {
    if (this.betMode() === 'parlay') {
      return parseFloat((this.parlayStake() * this.parlayOdds()).toFixed(0));
    }
    return this.betItems().reduce((sum, item) => sum + (item.stake || 0) * item.odds, 0);
  });

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        this.loadBalance();
        this.loadHistory();
      } else {
        this.balance.set(0);
        this.placedBets.set([]);
        this.betItems.set([]);
      }
    });
  }

  private loadBalance(): void {
    this.http.get<{ balance: number; total_deposited: number }>(`${API}/user/balance`).subscribe({
      next: ({ balance, total_deposited }) => {
        this.balance.set(balance);
        this.totalDeposited.set(total_deposited ?? 0);
      },
    });
  }

  private loadHistory(): void {
    this.http.get<any[]>(`${API}/bets`).subscribe({
      next: (bets) => {
        const mapped: PlacedBet[] = bets.map(b => ({
          id: b.id,
          matchId: b.matchId,
          matchName: b.matchName,
          selection: b.selection,
          selectionLabel: b.selectionLabel,
          odds: b.odds,
          stake: b.stake,
          placedAt: new Date(b.placedAt),
          status: b.status,
          potentialWin: b.potentialWin,
          isParlay: b.isParlay,
          parlayLegs: b.parlayLegs,
          combinedOdds: b.combinedOdds,
        }));
        this.placedBets.set(mapped);
      },
    });
  }

  switchMode(mode: BetMode): void {
    this.betMode.set(mode);
    this.parlayStake.set(0);
  }

  addBet(match: Match, selection: BetSelection): void {
    const selectionLabels: Record<BetSelection, string> = {
      home: '主隊勝', draw: '平局', away: '客隊勝',
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

    if (this.betItems().length >= 2) {
      this.betMode.set('parlay');
    }
  }

  removeBet(id: string): void {
    this.betItems.update(items => items.filter(b => b.id !== id));
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
    if (items.length === 0 || total <= 0 || total > this.balance()) return false;

    let betsToPlace: any[];

    if (this.betMode() === 'parlay') {
      if (items.length < 2) return false;
      const stake = this.parlayStake();
      const combinedOdds = this.parlayOdds();
      const potentialWin = parseFloat((stake * combinedOdds).toFixed(0));
      betsToPlace = [{
        id: `parlay-${Date.now()}`,
        matchId: 'parlay',
        matchName: `${items.length} 串 1 過關`,
        selection: 'home',
        selectionLabel: `${items.length} 串 1`,
        odds: combinedOdds,
        stake,
        potentialWin,
        isParlay: true,
        parlayLegs: items.map(i => ({
          matchName: i.matchName,
          selectionLabel: i.selectionLabel,
          odds: i.odds,
        })),
        combinedOdds,
      }];
    } else {
      betsToPlace = items
        .filter(item => item.stake > 0)
        .map(item => ({
          id: item.id,
          matchId: item.matchId,
          matchName: item.matchName,
          selection: item.selection,
          selectionLabel: item.selectionLabel,
          odds: item.odds,
          stake: item.stake,
          potentialWin: parseFloat((item.stake * item.odds).toFixed(0)),
          isParlay: false,
        }));
      if (betsToPlace.length === 0) return false;
    }

    this.http.post<any[]>(`${API}/bets/place`, {
      bets: betsToPlace,
      totalStake: total,
    }).subscribe({
      next: (created) => {
        const newBets: PlacedBet[] = created.map(b => ({
          id: b.id,
          matchId: b.matchId,
          matchName: b.matchName,
          selection: b.selection,
          selectionLabel: b.selectionLabel,
          odds: b.odds,
          stake: b.stake,
          placedAt: new Date(b.placedAt),
          status: b.status,
          potentialWin: b.potentialWin,
          isParlay: b.isParlay,
          parlayLegs: b.parlayLegs,
          combinedOdds: b.combinedOdds,
        }));
        this.placedBets.update(prev => [...newBets, ...prev]);
        this.balance.update(b => b - total);
        this.betItems.set([]);
        this.parlayStake.set(0);
        this.betMode.set('single');
        newBets.forEach(bet => this.scheduleSettle(bet));
      },
    });

    return true;
  }

  private scheduleSettle(bet: PlacedBet): void {
    const winRate = bet.isParlay ? 0.2 : 0.4;
    const timer = setTimeout(() => {
      const result: 'won' | 'lost' = Math.random() < winRate ? 'won' : 'lost';

      this.http.post(`${API}/bets/${bet.id}/settle`, { result }).subscribe({
        next: () => {
          this.placedBets.update(bets =>
            bets.map(b => b.id === bet.id ? { ...b, status: result } : b)
          );
          if (result === 'won') {
            this.balance.update(b => b + bet.potentialWin);
          }
          this.settleNotify$.next({ bet, result });
        },
      });

      this.settleTimers.delete(bet.id);
    }, 15000);

    this.settleTimers.set(bet.id, timer);
  }

  clearBets(): void {
    this.betItems.set([]);
    this.parlayStake.set(0);
    this.betMode.set('single');
  }

  isSelected(matchId: string, selection: BetSelection): boolean {
    return this.betItems().some(b => b.matchId === matchId && b.selection === selection);
  }
}
