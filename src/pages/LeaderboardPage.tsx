import { useState } from 'react';
import { User } from '../types';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { ThirdPlaceStandings } from '../components/leaderboard/ThirdPlaceStandings';

interface LeaderboardPageProps {
  user: User;
}

const TABS = [
  { id: 'pronosticos', label: 'Pronosticadores' },
  { id: 'terceros', label: 'Mejor 3°' },
] as const;

type TabId = typeof TABS[number]['id'];

export function LeaderboardPage({ user }: LeaderboardPageProps) {
  const [tab, setTab] = useState<TabId>('pronosticos');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#0d2b16] rounded-xl p-1 border border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id
                ? 'bg-[#ffd700] text-[#0d2b16]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pronosticos' && <Leaderboard currentUserId={user.token} />}
      {tab === 'terceros' && <ThirdPlaceStandings />}
    </div>
  );
}
