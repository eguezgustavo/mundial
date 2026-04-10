import { Match, Prediction, PredictedWinner } from '../types';

export function getActualWinner(match: Match): PredictedWinner | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return 'home';
  if (match.awayScore > match.homeScore) return 'away';
  return 'tie';
}

export function calculatePoints(match: Match, prediction: Prediction): number {
  if (match.homeScore === null || match.awayScore === null) return 0;

  const isExactScore =
    prediction.predictedHomeScore === match.homeScore &&
    prediction.predictedAwayScore === match.awayScore;

  if (isExactScore) return 20;

  const actualWinner = getActualWinner(match);
  if (prediction.predictedWinner === actualWinner) return 5;

  return 0;
}

export function isPredictionDeadlinePassed(matchDate: Date): boolean {
  // Deadline: 23:59 UTC-5 the day BEFORE the match
  const utcMinus5Offset = 5 * 60; // minutes
  const matchLocal = new Date(matchDate.getTime() - utcMinus5Offset * 60 * 1000);
  // Set to start of match day in UTC-5
  const deadline = new Date(matchLocal);
  deadline.setUTCHours(0, 0, 0, 0); // midnight UTC-5 = start of match day
  // Subtract 1 minute to get 23:59 of previous day
  deadline.setTime(deadline.getTime() - 60 * 1000);
  // Convert back to UTC for comparison
  const deadlineUTC = new Date(deadline.getTime() + utcMinus5Offset * 60 * 1000);
  return new Date() > deadlineUTC;
}
