import { Timestamp } from 'firebase/firestore';

export type Stage = 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'third_place' | 'final';
export type MatchStatus = 'upcoming' | 'finished';
export type PredictedWinner = 'home' | 'away' | 'tie';

export interface User {
  token: string;
  displayName: string;
  isAdmin: boolean;
  totalScore: number;
}

export interface Match {
  id: string;
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamFlag: string;
  awayTeamFlag: string;
  matchDate: Timestamp;
  stage: Stage;
  group?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedWinner: PredictedWinner;
  predictedHomeScore: number;
  predictedAwayScore: number;
  submittedAt: Timestamp;
  points: number | null;
}

export interface ApiFootballConfig {
  apiKey: string;
}
