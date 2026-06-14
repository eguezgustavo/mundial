import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { Spinner } from '../ui/Spinner';
import { UserPredictionDetail } from './UserPredictionDetail';

interface LeaderboardProps {
  currentUserId: string;
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ token: d.id, ...d.data() } as User)));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <Spinner className="py-12" />;

  return (
    <>
      <div className="bg-[#0d2b16] rounded-xl overflow-hidden border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs uppercase">
              <th className="py-3 px-4 text-left w-12">#</th>
              <th className="py-3 px-4 text-left">Jugador</th>
              <th className="py-3 px-4 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const isMe = u.token === currentUserId;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <tr
                  key={u.token}
                  onClick={() => setSelectedUser(u)}
                  className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors hover:bg-white/5 ${
                    isMe ? 'bg-[#ffd700]/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-white/60 text-sm">
                    {medal ?? <span className="text-white/40">{i + 1}</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-sm font-medium ${isMe ? 'text-[#ffd700]' : 'text-white'}`}>
                      {u.displayName}
                      {isMe && <span className="ml-1 text-xs text-white/40">(tú)</span>}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`text-sm font-bold ${isMe ? 'text-[#ffd700]' : 'text-white'}`}>
                      {u.totalScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserPredictionDetail
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}
