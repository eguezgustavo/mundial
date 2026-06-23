import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Match } from '../../types';
import { Spinner } from '../ui/Spinner';
import { TeamLogo } from '../ui/TeamLogo';

interface TeamStats {
  team: string;
  flag: string;
  group: string;
  played: number;
  points: number;
  gd: number;
  gf: number;
}

function computeGroupStandings(matches: Match[]): Record<string, TeamStats[]> {
  const stats: Record<string, Record<string, TeamStats>> = {};

  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null || !m.group) continue;
    const g = m.group;

    const init = (team: string, flag: string): TeamStats =>
      ({ team, flag, group: g, played: 0, points: 0, gd: 0, gf: 0 });

    if (!stats[g]) stats[g] = {};
    if (!stats[g][m.homeTeam]) stats[g][m.homeTeam] = init(m.homeTeam, m.homeTeamFlag);
    if (!stats[g][m.awayTeam]) stats[g][m.awayTeam] = init(m.awayTeam, m.awayTeamFlag);

    const hs = m.homeScore, as = m.awayScore;
    stats[g][m.homeTeam].played++;
    stats[g][m.awayTeam].played++;
    stats[g][m.homeTeam].gf += hs;
    stats[g][m.awayTeam].gf += as;
    stats[g][m.homeTeam].gd += hs - as;
    stats[g][m.awayTeam].gd += as - hs;

    if (hs > as) {
      stats[g][m.homeTeam].points += 3;
    } else if (hs < as) {
      stats[g][m.awayTeam].points += 3;
    } else {
      stats[g][m.homeTeam].points += 1;
      stats[g][m.awayTeam].points += 1;
    }
  }

  const sorted: Record<string, TeamStats[]> = {};
  for (const [g, teams] of Object.entries(stats)) {
    sorted[g] = Object.values(teams).sort((a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );
  }
  return sorted;
}

export function ThirdPlaceStandings() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'), where('stage', '==', 'group'));
    return onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner className="py-12" />;

  const standings = computeGroupStandings(matches);
  const thirds: TeamStats[] = Object.values(standings)
    .map((teams) => teams[2])
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));

  const totalGroups = 12;
  const groupsWithThird = Object.keys(standings).length;
  const qualify = 8;

  if (thirds.length === 0) {
    return (
      <p className="text-white/40 text-sm text-center py-12">
        Aún no hay partidos de grupos terminados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-white/40 text-xs text-center">
        Clasifican los 8 mejores de 12 grupos · {groupsWithThird}/{totalGroups} grupos con datos
      </div>

      <div className="bg-[#0d2b16] rounded-xl overflow-hidden border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
              <th className="py-2.5 px-3 text-left w-8">#</th>
              <th className="py-2.5 px-3 text-left">Equipo</th>
              <th className="py-2.5 px-2 text-center w-8" title="Grupo">Gr.</th>
              <th className="py-2.5 px-2 text-center w-8" title="Partidos jugados">PJ</th>
              <th className="py-2.5 px-2 text-center w-8" title="Puntos">Pts</th>
              <th className="py-2.5 px-2 text-center w-8" title="Diferencia de goles">DG</th>
              <th className="py-2.5 px-2 text-center w-8" title="Goles a favor">GF</th>
            </tr>
          </thead>
          <tbody>
            {thirds.map((t, i) => {
              const qualifies = i < qualify;
              return (
                <tr
                  key={t.team}
                  className={`border-b border-white/5 last:border-0 ${
                    qualifies ? '' : 'opacity-50'
                  } ${i === qualify - 1 ? 'border-b border-[#ffd700]/30' : ''}`}
                >
                  <td className="py-2.5 px-3 text-white/50 text-sm">{i + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo src={t.flag} name={t.team} className="w-5 h-5" />
                      <span className={`text-sm font-medium ${qualifies ? 'text-white' : 'text-white/50'}`}>
                        {t.team}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-white/50 text-xs font-mono">{t.group}</td>
                  <td className="py-2.5 px-2 text-center text-white/60 text-xs font-mono">{t.played}</td>
                  <td className={`py-2.5 px-2 text-center text-sm font-bold ${qualifies ? 'text-[#ffd700]' : 'text-white/40'}`}>
                    {t.points}
                  </td>
                  <td className="py-2.5 px-2 text-center text-white/60 text-xs font-mono">
                    {t.gd > 0 ? `+${t.gd}` : t.gd}
                  </td>
                  <td className="py-2.5 px-2 text-center text-white/60 text-xs font-mono">{t.gf}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-white/25 text-xs text-center leading-relaxed px-2">
        Desempate: puntos → diferencia de goles → goles a favor → fair play → ranking FIFA
      </p>
    </div>
  );
}
