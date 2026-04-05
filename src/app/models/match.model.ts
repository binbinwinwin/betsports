export type SportType = 'football' | 'basketball' | 'baseball' | 'tennis' | 'esports';
export type MatchStatus = 'live' | 'upcoming' | 'finished';
export type BetSelection = 'home' | 'draw' | 'away';
export type BetMode = 'single' | 'parlay';

export interface Match {
  id: string;
  sport: SportType;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: MatchStatus;
  score: { home: number; away: number };
  odds: { home: number; draw: number | null; away: number };
  minute?: number;
  period?: string;
}

export interface BetItem {
  id: string;
  matchId: string;
  matchName: string;
  selection: BetSelection;
  selectionLabel: string;
  odds: number;
  stake: number;
  sport?: SportType;
}

export interface ParlayLeg {
  matchId?: string;
  matchName: string;
  selectionLabel: string;
  odds: number;
}

export interface PlacedBet extends BetItem {
  placedAt: Date;
  status: 'pending' | 'won' | 'lost';
  potentialWin: number;
  isParlay?: boolean;
  parlayLegs?: ParlayLeg[];
  combinedOdds?: number;
}
