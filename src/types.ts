/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type League = "nba" | "wnba";

export interface TeamStats {
  id: string;
  name: string;
  abbreviation: string;
  logoColor: string;
  secondaryColor?: string;
  offenseRating: number; // pts per 100 possessions
  defenseRating: number; // pts allowed per 100 possessions
  pace: number;          // possessions per 48 mins
  restDays: number;
  seasonRecord: string;
  league?: "nba" | "wnba";
}

export interface MatchupDetails {
  paceProjected: number;
  homeOffRatingAdjusted: number;
  awayOffRatingAdjusted: number;
  homeScoreProjected: number;
  awayScoreProjected: number;
  homeWinProb: number;
  modelCoefficients: {
    homeCourtAdvantage: number;
    restDayMultiplier: number;
    headToHeadWeight: number;
  };
}

export interface PlayerStats {
  player_id: string;
  name: string;
  team: string;
  position: string;
  number: string;
  avatarUrl: string;
  avgMIN: number;
  avgPTS: number;
  avgTRB: number;
  avgAST: number;
  avg3PT: number;
  avgFG: number;
  avgPF: number;
  league?: "nba" | "wnba";
}

export interface GameLog {
  Date: string;
  Season: string;
  Opp: string;
  Home: boolean;
  MIN: number;
  PTS: number;
  TRB: number;
  AST: number;
  "3PT": number;
  FG: number;
  PF: number;
}

export interface PlayerPrediction {
  target: string;
  projected: number;
  rmse: number;
  ciLow: number;
  ciHigh: number;
}

export interface DataOpLog {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}
