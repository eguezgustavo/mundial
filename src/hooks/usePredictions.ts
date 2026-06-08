import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Prediction, PredictedWinner } from '../types';

export function usePredictions(userId: string) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'predictions'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const map: Record<string, Prediction> = {};
      snapshot.docs.forEach((d) => {
        const pred = { id: d.id, ...d.data() } as Prediction;
        map[pred.matchId] = pred;
      });
      setPredictions(map);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const submitPrediction = async (
    matchId: string,
    predictedWinner: PredictedWinner,
    predictedHomeScore: number,
    predictedAwayScore: number
  ) => {
    const id = `${userId}_${matchId}`;
    await setDoc(doc(db, 'predictions', id), {
      userId,
      matchId,
      predictedWinner,
      predictedHomeScore,
      predictedAwayScore,
      submittedAt: Timestamp.now(),
    });
  };

  return { predictions, loading, submitPrediction };
}
