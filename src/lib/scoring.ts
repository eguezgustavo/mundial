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

export function isPredictionDeadlinePassed(matchDate: Date, now: Date = new Date()): boolean {
  // Deadline: 20 minutes before kickoff
  const deadline = new Date(matchDate.getTime() - 20 * 60 * 1000);
  return now > deadline;
}
