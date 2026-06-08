import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TokenGate } from './components/auth/TokenGate';
import { BottomNav } from './components/layout/BottomNav';
import { RulesModal } from './components/ui/RulesModal';
import { Home } from './pages/Home';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const [showRules, setShowRules] = useState(false);

  return (
    <BrowserRouter>
      <TokenGate>
        {(user) => (
          <div className="min-h-screen bg-[#1a472a] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0d2b16]/95 backdrop-blur border-b border-white/10">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                <h1 className="text-[#ffd700] font-bold text-lg tracking-wide">⚽ Mundial 2026</h1>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRules(true)}
                    className="text-white/50 hover:text-white text-sm font-medium transition-colors"
                    title="Reglas"
                  >
                    ℹ️
                  </button>
                  <span className="text-white/60 text-sm">{user.displayName}</span>
                </div>
              </div>
            </header>

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Main content */}
            <main className="max-w-lg mx-auto px-4 py-4">
              <Routes>
                <Route path="/" element={<Home user={user} />} />
                <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
                <Route path="/admin" element={<AdminPage user={user} />} />
              </Routes>
            </main>

            <BottomNav user={user} />
          </div>
        )}
      </TokenGate>
    </BrowserRouter>
  );
}

export default App;
