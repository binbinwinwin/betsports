import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { BetService } from './bet.service';
import { AuthService } from './auth.service';
import { BetItem } from '../models/match.model';

// AuthService 的假實作，避免真實版去讀 localStorage
const fakeAuthService = {
  currentUser: signal<any>(null),
  token: signal<string | null>(null),
};

// ---- 測試用假資料 ----
const makeBetItem = (id: string, odds: number, stake = 0): BetItem => ({
  id,
  matchId: `match-${id}`,
  matchName: `隊伍A vs 隊伍B (${id})`,
  selection: 'home',
  selectionLabel: '主隊勝',
  odds,
  stake,
  sport: 'football',
});

describe('BetService', () => {
  let service: BetService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BetService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: fakeAuthService },
      ],
    });
    service = TestBed.inject(BetService);
  });

  // ── 1. 會員等級 ──────────────────────────────────
  describe('memberTier', () => {
    it('入金 0 → 一般會員', () => {
      service.totalDeposited.set(0);
      expect(service.memberTier()).toBe('normal');
    });

    it('入金 50,000 → 高級會員', () => {
      service.totalDeposited.set(50000);
      expect(service.memberTier()).toBe('premium');
    });

    it('入金 100,000 → 尊榮會員', () => {
      service.totalDeposited.set(100000);
      expect(service.memberTier()).toBe('vip');
    });

    it('入金 500,000 → 鑽石會員', () => {
      service.totalDeposited.set(500000);
      expect(service.memberTier()).toBe('diamond');
    });
  });

  // ── 2. 串關賠率計算 ──────────────────────────────
  describe('parlayOdds', () => {
    it('無投注時賠率為 1', () => {
      service.betItems.set([]);
      expect(service.parlayOdds()).toBe(1);
    });

    it('兩場賠率相乘：2.0 × 3.0 = 6.0', () => {
      service.betItems.set([
        makeBetItem('a', 2.0),
        makeBetItem('b', 3.0),
      ]);
      expect(service.parlayOdds()).toBe(6.0);
    });

    it('三場賠率相乘：1.5 × 2.0 × 2.5 = 7.5', () => {
      service.betItems.set([
        makeBetItem('a', 1.5),
        makeBetItem('b', 2.0),
        makeBetItem('c', 2.5),
      ]);
      expect(service.parlayOdds()).toBe(7.5);
    });
  });

  // ── 3. isSelected ────────────────────────────────
  describe('isSelected', () => {
    it('投注清單有此場次+選擇 → true', () => {
      service.betItems.set([makeBetItem('x', 1.8)]);
      expect(service.isSelected('match-x', 'home')).toBe(true);
    });

    it('場次不同 → false', () => {
      service.betItems.set([makeBetItem('x', 1.8)]);
      expect(service.isSelected('match-y', 'home')).toBe(false);
    });

    it('選擇不同 → false', () => {
      service.betItems.set([makeBetItem('x', 1.8)]);
      expect(service.isSelected('match-x', 'away')).toBe(false);
    });
  });

  // ── 4. removeBet ─────────────────────────────────
  describe('removeBet', () => {
    it('移除指定 id 後清單減少', () => {
      service.betItems.set([makeBetItem('a', 2.0), makeBetItem('b', 1.5)]);
      service.removeBet('a');
      expect(service.betItems().length).toBe(1);
      expect(service.betItems()[0].id).toBe('b');
    });

    it('剩餘 < 2 筆時模式自動切回 single', () => {
      service.betItems.set([makeBetItem('a', 2.0), makeBetItem('b', 1.5)]);
      service.betMode.set('parlay');
      service.removeBet('a');
      expect(service.betMode()).toBe('single');
    });
  });
});
