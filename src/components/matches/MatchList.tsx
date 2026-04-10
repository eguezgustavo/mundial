import { useState } from 'react';
import { Match, Prediction, User, PredictedWinner } from '../../types';
import { MatchCard } from './MatchCard';

interface MatchListProps {
  matches: Match[];
  predictions: Record<string, Prediction>;
  user: User;
  onSubmitPrediction: (matchId: string, winner: PredictedWinner, homeScore: number, awayScore: number) => Promise<void>;
}

export function MatchList({ matches, predictions, user, onSubmitPrediction }: MatchListProps) {
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');

  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const finished = matches.filter((m) => m.status === 'finished').reverse();

  const displayed = tab === 'upcoming' ? upcoming : finished;

  return (
    <div>
      {/* Tabs */}
      <div className="flex bg-[#0d2b16] rounded-xl p-1 mb-4">
        {(['upcoming', 'finished'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-[#ffd700] text-[#1a472a]' : 'text-white/60 hover:text-white'
            }`}
          >
            {t === 'upcoming' ? `Próximos (${upcoming.length})` : `Finalizados (${finished.length})`}
          </button>
        ))}
      </div>

      {/* Match cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <div className="text-4xl mb-2">⚽</div>
          <p>{tab === 'upcoming' ? 'No hay partidos próximos' : 'No hay partidos finalizados aún'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              user={user}
              onSubmitPrediction={onSubmitPrediction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
