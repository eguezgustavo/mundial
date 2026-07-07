import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TopScorer } from '../types';

export function useTopScorers() {
  const [players, setPlayers] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'stats', 'topScorers'),
      (snap) => {
        setPlayers((snap.data()?.players as TopScorer[]) ?? []);
        setLoading(false);
      },
      (err) => {
        console.error('useTopScorers error:', err);
        setError('No se pudo cargar la tabla de goleadores.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { players, loading, error };
}
