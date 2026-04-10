import { User, PredictedWinner } from '../types';
import { useMatches } from '../hooks/useMatches';
import { usePredictions } from '../hooks/usePredictions';
import { MatchList } from '../components/matches/MatchList';
import { Spinner } from '../components/ui/Spinner';

interface HomeProps {
  user: User;
}

export function Home({ user }: HomeProps) {
  const { matches, loading: matchesLoading } = useMatches();
  const { predictions, loading: predsLoading, submitPrediction } = usePredictions(user.token);

  const handleSubmit = async (matchId: string, winner: PredictedWinner, homeScore: number, awayScore: number) => {
    await submitPrediction(matchId, winner, homeScore, awayScore);
  };

  if (matchesLoading || predsLoading) return <Spinner className="py-12" />;

  return (
    <MatchList
      matches={matches}
      predictions={predictions}
      user={user}
      onSubmitPrediction={handleSubmit}
    />
  );
}
