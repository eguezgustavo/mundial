import { User, PredictedWinner } from '../types';
import { useMatches } from '../hooks/useMatches';
import { usePredictions } from '../hooks/usePredictions';
import { MatchCard } from '../components/matches/MatchCard';
import { Spinner } from '../components/ui/Spinner';

interface TodayPageProps {
  user: User;
}

function isSameLocalDay(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

export function TodayPage({ user }: TodayPageProps) {
  const { matches, loading: matchesLoading } = useMatches();
  const { predictions, loading: predsLoading, submitPrediction } = usePredictions(user.token);

  const handleSubmit = async (matchId: string, winner: PredictedWinner, homeScore: number, awayScore: number) => {
    await submitPrediction(matchId, winner, homeScore, awayScore);
  };

  if (matchesLoading || predsLoading) return <Spinner className="py-12" />;

  const today = new Date();
  const todayMatches = matches.filter((m) => isSameLocalDay(m.matchDate.toDate(), today));

  if (todayMatches.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <div className="text-5xl mb-3">📅</div>
        <p className="text-base font-medium">No hay partidos hoy</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-white font-bold text-xl">Familia Egüez</h2>
        <p className="text-white/50 text-sm italic">Todos para uno y uno para todos</p>
      </div>
      <div className="space-y-3">
      {todayMatches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          prediction={predictions[match.id]}
          user={user}
          now={today}
          onSubmitPrediction={handleSubmit}
        />
      ))}
      </div>
      <div className="mt-6 text-center">
        <a
          href="https://www.google.com/search?q=tabla+de+posiciones+copa+del+mundo+2026"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-white/50 hover:text-white text-sm underline underline-offset-4 transition-colors"
        >
          Mirar la tabla de posiciones en Google →
        </a>
      </div>
    </div>
  );
}
