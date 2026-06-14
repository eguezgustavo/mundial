import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Prediction, Match } from '../../types';
import { Spinner } from '../ui/Spinner';

interface Props {
  user: User;
  onClose: () => void;
}

export function UserPredictionDetail({ user, onClose }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [predsSnap, matchesSnap] = await Promise.all([
        getDocs(query(collection(db, 'predictions'), where('userId', '==', user.token))),
        getDocs(collection(db, 'matches')),
      ]);
      setPredictions(predsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Prediction)));
      setMatches(matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
      setLoading(false);
    };
    load();
  }, [user.token]);

  const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));

  const sorted = [...predictions].sort((a, b) => {
    const ma = matchMap[a.matchId];
    const mb = matchMap[b.matchId];
    if (!ma || !mb) return 0;
    return ma.matchDate.toMillis() - mb.matchDate.toMillis();
  });

  const finished = sorted.filter((p) => matchMap[p.matchId]?.status === 'finished');
  const pending = sorted.filter((p) => matchMap[p.matchId]?.status !== 'finished');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-[#0d2b16] rounded-2xl border border-white/10 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{user.displayName}</h2>
            <p className="text-[#ffd700] text-xs font-semibold mt-0.5">{user.totalScore} puntos totales</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <Spinner className="py-8" />
          ) : sorted.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">Sin predicciones</p>
          ) : (
            <>
              {finished.length > 0 && (
                <section>
                  <h3 className="text-white/40 text-xs uppercase tracking-wide mb-2">Jugados</h3>
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs">
                          <th className="py-2 px-3 text-left">Partido</th>
                          <th className="py-2 px-2 text-center">Pred.</th>
                          <th className="py-2 px-2 text-center">Real</th>
                          <th className="py-2 px-3 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finished.map((pred) => {
                          const match = matchMap[pred.matchId];
                          if (!match) return null;
                          const pts = pred.points ?? 0;
                          return (
                            <tr key={pred.id} className="border-b border-white/5 last:border-0">
                              <td className="py-2.5 px-3 text-white/70 text-xs leading-snug">
                                <span>{match.homeTeamFlag}</span>
                                <span className="mx-1">{match.homeTeam}</span>
                                <span className="text-white/30">vs</span>
                                <span className="mx-1">{match.awayTeam}</span>
                                <span>{match.awayTeamFlag}</span>
                              </td>
                              <td className="py-2.5 px-2 text-center text-white font-mono text-xs">
                                {pred.predictedHomeScore}–{pred.predictedAwayScore}
                              </td>
                              <td className="py-2.5 px-2 text-center text-white/50 font-mono text-xs">
                                {match.homeScore}–{match.awayScore}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold text-xs ${pts > 0 ? 'text-[#ffd700]' : 'text-white/25'}`}>
                                {pts > 0 ? `+${pts}` : '0'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {pending.length > 0 && (
                <section>
                  <h3 className="text-white/40 text-xs uppercase tracking-wide mb-2">Pendientes</h3>
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs">
                          <th className="py-2 px-3 text-left">Partido</th>
                          <th className="py-2 px-3 text-right">Predicción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((pred) => {
                          const match = matchMap[pred.matchId];
                          if (!match) return null;
                          return (
                            <tr key={pred.id} className="border-b border-white/5 last:border-0">
                              <td className="py-2.5 px-3 text-white/50 text-xs leading-snug">
                                <span>{match.homeTeamFlag}</span>
                                <span className="mx-1">{match.homeTeam}</span>
                                <span className="text-white/30">vs</span>
                                <span className="mx-1">{match.awayTeam}</span>
                                <span>{match.awayTeamFlag}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-white/50 font-mono text-xs">
                                {pred.predictedHomeScore}–{pred.predictedAwayScore}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
