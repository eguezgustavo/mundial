import { useTopScorers } from '../hooks/useTopScorers';
import { TeamLogo } from '../components/ui/TeamLogo';
import { Spinner } from '../components/ui/Spinner';

export function GoalLeadersPage() {
  const { players, loading, error } = useTopScorers();

  if (loading) return <Spinner className="py-12" />;
  if (error) return <p className="text-center text-white/50 text-sm py-12">{error}</p>;

  return (
    <div className="bg-[#0d2b16] rounded-xl overflow-hidden border border-white/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs uppercase">
            <th className="py-3 px-4 text-left w-12">#</th>
            <th className="py-3 px-4 text-left">Jugador</th>
            <th className="py-3 px-4 text-right">Goles</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : null;
            return (
              <tr key={`${p.name}-${p.rank}`} className="border-b border-white/5 last:border-0">
                <td className="py-3.5 px-4 text-white/60 text-sm">
                  {medal ?? <span className="text-white/40">{p.rank}</span>}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <TeamLogo src={p.teamFlag} name={p.team} className="w-6 h-6 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{p.name}</div>
                      <div className="text-xs text-white/40 truncate">{p.team}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-sm font-bold text-[#ffd700]">{p.goals}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
