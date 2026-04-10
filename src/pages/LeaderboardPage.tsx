import { User } from '../types';
import { Leaderboard } from '../components/leaderboard/Leaderboard';

interface LeaderboardPageProps {
  user: User;
}

export function LeaderboardPage({ user }: LeaderboardPageProps) {
  return <Leaderboard currentUserId={user.token} />;
}
