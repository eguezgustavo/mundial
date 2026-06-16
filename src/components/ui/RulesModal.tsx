interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-[#0d2b16] rounded-2xl border border-white/10 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Reglas del torneo</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Points */}
        <section>
          <h3 className="text-[#ffd700] font-semibold text-sm uppercase tracking-wide mb-3">Puntuación</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-white font-semibold text-sm">Resultado exacto</p>
                <p className="text-white/60 text-xs mt-0.5">Aciertas el marcador exacto del partido (ej. 2–1)</p>
                <p className="text-[#ffd700] font-bold mt-1">20 puntos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-white font-semibold text-sm">Ganador correcto</p>
                <p className="text-white/60 text-xs mt-0.5">Aciertas quién gana o si hay empate, pero no el marcador exacto</p>
                <p className="text-green-400 font-bold mt-1">5 puntos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-white font-semibold text-sm">Pronóstico incorrecto o sin pronóstico</p>
                <p className="text-white/60 text-xs mt-0.5">El resultado no coincide con tu predicción, o no enviaste una</p>
                <p className="text-white/40 font-bold mt-1">0 puntos</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section>
          <h3 className="text-[#ffd700] font-semibold text-sm uppercase tracking-wide mb-3">Reglas</h3>
          <ul className="space-y-2 text-white/70 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>El plazo para enviar tu pronóstico es hasta <strong className="text-white">20 minutos antes</strong> del inicio del partido.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>En <strong className="text-white">fase de grupos</strong> puedes pronosticar victoria local, empate o victoria visitante.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>En <strong className="text-white">rondas eliminatorias</strong> no hay empate — solo victoria local o visitante.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>El marcador se evalúa al <strong className="text-white">final de los 90 minutos</strong>. Tiempo extra y penales no cuentan.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/40 mt-0.5">•</span>
              <span>Puedes actualizar tu pronóstico las veces que quieras antes del plazo.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
