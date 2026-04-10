import { useState } from 'react';
import { Match, Prediction, PredictedWinner } from '../../types';
import { Button } from '../ui/Button';

interface PredictionFormProps {
  match: Match;
  existing?: Prediction;
  onSubmit: (winner: PredictedWinner, homeScore: number, awayScore: number) => Promise<void>;
}

export function PredictionForm({ match, existing, onSubmit }: PredictionFormProps) {
  const [winner, setWinner] = useState<PredictedWinner | null>(existing?.predictedWinner ?? null);
  const [homeScore, setHomeScore] = useState<string>(
    existing?.predictedHomeScore !== undefined ? String(existing.predictedHomeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    existing?.predictedAwayScore !== undefined ? String(existing.predictedAwayScore) : ''
  );
  const [saving, setSaving] = useState(false);

  const canTie = match.stage === 'group';

  const handleSubmit = async () => {
    if (!winner || homeScore === '' || awayScore === '') return;
    setSaving(true);
    try {
      await onSubmit(winner, parseInt(homeScore), parseInt(awayScore));
    } finally {
      setSaving(false);
    }
  };

  // Auto-set winner based on scores
  const handleScoreChange = (side: 'home' | 'away', val: string) => {
    const clean = val.replace(/\D/, '').slice(0, 2);
    if (side === 'home') setHomeScore(clean);
    else setAwayScore(clean);

    const h = side === 'home' ? parseInt(clean) : parseInt(homeScore);
    const a = side === 'away' ? parseInt(clean) : parseInt(awayScore);

    if (!isNaN(h) && !isNaN(a)) {
      if (h > a) setWinner('home');
      else if (a > h) setWinner('away');
      else if (canTie) setWinner('tie');
      else setWinner(null);
    }
  };

  const isValid = winner !== null && homeScore !== '' && awayScore !== '';
  const hasChanged =
    winner !== existing?.predictedWinner ||
    homeScore !== String(existing?.predictedHomeScore ?? '') ||
    awayScore !== String(existing?.predictedAwayScore ?? '');

  return (
    <div className="mt-3 space-y-3">
      {/* Score inputs */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          max="99"
          value={homeScore}
          onChange={(e) => handleScoreChange('home', e.target.value)}
          placeholder="0"
          className="flex-1 bg-white/10 text-white text-center text-xl font-bold rounded-lg py-2 border border-white/20 focus:border-[#ffd700] focus:outline-none"
        />
        <span className="text-white/50 font-bold">:</span>
        <input
          type="number"
          min="0"
          max="99"
          value={awayScore}
          onChange={(e) => handleScoreChange('away', e.target.value)}
          placeholder="0"
          className="flex-1 bg-white/10 text-white text-center text-xl font-bold rounded-lg py-2 border border-white/20 focus:border-[#ffd700] focus:outline-none"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || !hasChanged}
        loading={saving}
        className="w-full"
      >
        {existing ? 'Actualizar pronóstico' : 'Enviar pronóstico'}
      </Button>
    </div>
  );
}
