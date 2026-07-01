import { useMatches } from '../hooks/useMatches';
import { Match } from '../types';
import { TeamLogo } from '../components/ui/TeamLogo';
import { Spinner } from '../components/ui/Spinner';

// ── Layout constants ──────────────────────────────────────────────────────────
const TH = 26;           // team-row height (px)
const MH = TH * 2 + 1;  // match height = 53 px
const RW = 120;          // round-column width
const LW = 20;           // connector-line gap between columns
const COL = RW + LW;     // step per round = 140 px

// 5 rounds (R32→R16→QF→SF→Final), 16 matches tall
const CANVAS_H = 16 * MH;          // 848 px
const CANVAS_W = 4 * COL + RW;     // 680 px

const matchTop = (round: number, pos: number) =>
  Math.round(((Math.pow(2, round) - 1) / 2 + pos * Math.pow(2, round)) * MH);

const roundX = (round: number) => round * COL;

// ── WC 2026 bracket order (top→bottom within each stage) ─────────────────────
// Source: official FIFA bracket (fifa.com)
// R16 pairings: 89(74v77), 90(73v75), 91(76v78), 92(79v80),
//               93(83v84), 94(81v82), 95(86v88), 96(85v87)
// QF: 97(89v90), 98(93v94), 99(91v92), 100(95v96)
const BRACKET_ORDER = {
  r32: [2, 5, 0, 3,  11,10, 9, 8,  1, 4, 6, 7,  14,13,12,15],
  r16: [1, 0, 4, 5,   2, 3, 6, 7],
  qf:  [0, 1, 2, 3],
  sf:  [0, 1],
} as const;

// ── Name shortening ───────────────────────────────────────────────────────────
function short(name: string): string {
  if (!name) return '?';
  return name
    .replace('Third Place Group ', '3° ')
    .replace(/Group ([A-L]) Winner/, '1° $1')
    .replace(/Group ([A-L]) 2nd Place/, '2° $1')
    .replace(/Round of 32 (.+) Winner/, 'R32 $1 ★')
    .replace(/Round of 16 (.+) Winner/, 'R16 $1 ★')
    .replace(/Quarterfinal (.+) Winner/, 'QF$1 ★')
    .replace(/Semifinal (.+) Winner/, 'SF$1 ★')
    .replace('South Africa', 'S. Africa')
    .replace('Bosnia-Herzegovina', 'Bosnia')
    .replace('United States', 'USA')
    .slice(0, 14);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TeamRow({ flag, name, score, won }: {
  flag: string; name: string; score: number | null | undefined; won: boolean;
}) {
  return (
    <div
      style={{ height: TH }}
      className={`flex items-center gap-1 px-1.5 ${won ? 'bg-[#ffd700]/10' : ''}`}
    >
      <TeamLogo src={flag} name={name} className="w-5 h-5 flex-shrink-0" />
      <span className={`flex-1 text-[10px] leading-tight truncate ${won ? 'text-white font-bold' : 'text-white/55'}`}>
        {short(name)}
      </span>
      {score != null && (
        <span className={`text-[11px] font-bold tabular-nums ml-0.5 ${won ? 'text-[#ffd700]' : 'text-white/35'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchBox({ match, x, y }: { match: Match | null; x: number; y: number }) {
  const finished = match?.status === 'finished';
  const homeWon = finished && (match!.homeScore ?? 0) > (match!.awayScore ?? 0);
  const awayWon = finished && (match!.awayScore ?? 0) > (match!.homeScore ?? 0);

  return (
    <div
      style={{ position: 'absolute', left: x, top: y, width: RW, height: MH }}
      className="bg-[#0d2b16] border border-white/15 rounded-md overflow-hidden"
    >
      {match ? (
        <>
          <TeamRow flag={match.homeTeamFlag} name={match.homeTeam}
            score={finished ? match.homeScore : undefined} won={homeWon} />
          <div className="border-t border-white/10" />
          <TeamRow flag={match.awayTeamFlag} name={match.awayTeam}
            score={finished ? match.awayScore : undefined} won={awayWon} />
        </>
      ) : (
        <>
          <div style={{ height: TH }} className="flex items-center px-2">
            <span className="text-white/15 text-[10px]">TBD</span>
          </div>
          <div className="border-t border-white/10" />
          <div style={{ height: TH }} className="flex items-center px-2">
            <span className="text-white/15 text-[10px]">TBD</span>
          </div>
        </>
      )}
    </div>
  );
}

function ConnectorLines({ fromRound, numNextMatches }: { fromRound: number; numNextMatches: number }) {
  const lines: React.ReactNode[] = [];
  const xRight = roundX(fromRound) + RW;
  const xMid   = xRight + LW / 2;
  const xNext  = roundX(fromRound + 1);
  const stroke = '#ffffff22';
  const sw = 1.5;

  for (let i = 0; i < numNextMatches; i++) {
    const ya = matchTop(fromRound, i * 2) + MH / 2;
    const yb = matchTop(fromRound, i * 2 + 1) + MH / 2;
    const ym = (ya + yb) / 2;
    lines.push(
      <g key={i}>
        <line x1={xRight} y1={ya} x2={xMid} y2={ya} stroke={stroke} strokeWidth={sw} />
        <line x1={xRight} y1={yb} x2={xMid} y2={yb} stroke={stroke} strokeWidth={sw} />
        <line x1={xMid}   y1={ya} x2={xMid} y2={yb} stroke={stroke} strokeWidth={sw} />
        <line x1={xMid}   y1={ym} x2={xNext} y2={ym} stroke={stroke} strokeWidth={sw} />
      </g>
    );
  }
  return <>{lines}</>;
}

// Vertical positions for the two final-column boxes
// Final stays at the connector-arrival point; third place sits directly above it
const FINAL_Y = matchTop(4, 0);       // 398 — connector from SFs lands at its centre
const THIRD_Y = FINAL_Y - MH - 10;   // 335 — just above the Final

// ── Main page ─────────────────────────────────────────────────────────────────
export function BracketPage() {
  const { matches, loading } = useMatches();

  if (loading) return <Spinner className="py-12" />;

  const byStage = (stage: string) =>
    matches.filter((m) => m.stage === stage).sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());

  const r32 = byStage('round_of_32');
  const r16 = byStage('round_of_16');
  const qf  = byStage('quarterfinal');
  const sf  = byStage('semifinal');
  const finalMatch      = byStage('final')[0] ?? null;
  const thirdPlaceMatch = byStage('third_place')[0] ?? null;

  const r32s = BRACKET_ORDER.r32.map((i) => r32[i] ?? null);
  const r16s = BRACKET_ORDER.r16.map((i) => r16[i] ?? null);
  const qfs  = BRACKET_ORDER.qf.map((i) => qf[i] ?? null);
  const sfs  = BRACKET_ORDER.sf.map((i) => sf[i] ?? null);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto -mx-4 px-4">
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative', flexShrink: 0 }}>
          {/* SVG connector lines */}
          <svg
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            <ConnectorLines fromRound={0} numNextMatches={8} />
            <ConnectorLines fromRound={1} numNextMatches={4} />
            <ConnectorLines fromRound={2} numNextMatches={2} />
            <ConnectorLines fromRound={3} numNextMatches={1} />
          </svg>

          {r32s.map((m, i) => <MatchBox key={i} match={m} x={roundX(0)} y={matchTop(0, i)} />)}
          {r16s.map((m, i) => <MatchBox key={i} match={m} x={roundX(1)} y={matchTop(1, i)} />)}
          {qfs.map((m, i)  => <MatchBox key={i} match={m} x={roundX(2)} y={matchTop(2, i)} />)}
          {sfs.map((m, i)  => <MatchBox key={i} match={m} x={roundX(3)} y={matchTop(3, i)} />)}

          {/* Third place — above the Final in the same column */}
          <div style={{ position: 'absolute', left: roundX(4), top: THIRD_Y - 13, width: RW }}
            className="text-center text-[8px] text-white/25 font-bold uppercase tracking-widest">
            🥉 3° Puesto
          </div>
          <MatchBox match={thirdPlaceMatch} x={roundX(4)} y={THIRD_Y} />

          {/* Final */}
          <div style={{ position: 'absolute', left: roundX(4), top: FINAL_Y - 13, width: RW }}
            className="text-center text-[8px] text-[#ffd700]/50 font-bold uppercase tracking-widest">
            🏆 Final
          </div>
          <MatchBox match={finalMatch} x={roundX(4)} y={FINAL_Y} />

          {/* Round labels */}
          {[['R32', 0], ['Octavos', 1], ['Cuartos', 2], ['Semis', 3]].map(([lbl, r]) => (
            <div
              key={r}
              style={{ position: 'absolute', left: roundX(r as number), top: CANVAS_H + 4, width: RW }}
              className="text-center text-[9px] text-white/25 font-semibold uppercase tracking-wider"
            >
              {lbl}
            </div>
          ))}
        </div>
        <div style={{ height: 18 }} />
      </div>
    </div>
  );
}
