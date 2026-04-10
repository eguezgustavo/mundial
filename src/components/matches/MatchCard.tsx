import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Match, Prediction, User, PredictedWinner } from '../../types';
import { isPredictionDeadlinePassed } from '../../lib/scoring';
import { PredictionForm } from './PredictionForm';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  user: User;
  onSubmitPrediction: (matchId: string, winner: PredictedWinner, homeScore: number, awayScore: number) => Promise<void>;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
};

const WINNER_LABEL: Record<PredictedWinner, string> = {
  home: 'Victoria local',
  away: 'Victoria visitante',
  tie: 'Empate',
};

export function MatchCard({ match, prediction, onSubmitPrediction }: MatchCardProps) {
  const matchDate = match.matchDate.toDate();
  const deadlinePassed = isPredictionDeadlinePassed(matchDate);
  const isFinished = match.status === 'finished';

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;
  const groupLabel = match.group ? ` · Grupo ${match.group}` : '';

  const handleSubmit = async (winner: PredictedWinner, homeScore: number, awayScore: number) => {
    await onSubmitPrediction(match.id, winner, homeScore, awayScore);
  };

  return (
    <div className="bg-[#0d2b16] rounded-xl p-4 border border-white/10">
      {/* Stage / Date header */}
      <div className="flex justify-between items-center mb-3 text-xs text-white/50">
        <span>{stageLabel}{groupLabel}</span>
        <span>{format(matchDate, "d 'de' MMM · HH:mm", { locale: es })}</span>
      </div>

      {/* Teams and score */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 text-right">
          <div className="text-lg">{match.homeTeamFlag}</div>
          <div className="text-white text-sm font-semibold leading-tight">{match.homeTeam}</div>
        </div>

        {/* Score or VS */}
        <div className="text-center min-w-[60px]">
          {isFinished ? (
            <div className="text-[#ffd700] text-2xl font-bold">
              {match.homeScore} – {match.awayScore}
            </div>
          ) : (
            <div className="text-white/40 text-sm font-medium">VS</div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-left">
          <div className="text-lg">{match.awayTeamFlag}</div>
          <div className="text-white text-sm font-semibold leading-tight">{match.awayTeam}</div>
        </div>
      </div>

      {/* Prediction section */}
      {isFinished ? (
        <div className="mt-3 pt-3 border-t border-white/10">
          {prediction ? (
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">
                Tu pronóstico: <span className="text-white">{prediction.predictedHomeScore}–{prediction.predictedAwayScore}</span>
                <span className="ml-1 text-white/50">({WINNER_LABEL[prediction.predictedWinner]})</span>
              </span>
              <span className={`font-bold ${prediction.points === 20 ? 'text-[#ffd700]' : prediction.points === 5 ? 'text-green-400' : 'text-white/40'}`}>
                {prediction.points !== null ? `+${prediction.points} pts` : 'Pendiente'}
              </span>
            </div>
          ) : (
            <p className="text-white/40 text-sm text-center">Sin pronóstico</p>
          )}
        </div>
      ) : deadlinePassed ? (
        <div className="mt-3 pt-3 border-t border-white/10">
          {prediction ? (
            <p className="text-white/50 text-sm text-center">
              Bloqueado: {prediction.predictedHomeScore}–{prediction.predictedAwayScore} · {WINNER_LABEL[prediction.predictedWinner]}
            </p>
          ) : (
            <p className="text-red-400/70 text-sm text-center">Pronósticos cerrados · Sin pronóstico</p>
          )}
        </div>
      ) : (
        <PredictionForm
          match={match}
          existing={prediction}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
