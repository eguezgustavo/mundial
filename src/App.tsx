import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TokenGate } from './components/auth/TokenGate';
import { Sidebar } from './components/layout/Sidebar';
import { BottomMenuHint, MENU_HINT_STORAGE_KEY } from './components/layout/BottomMenuHint';
import { RulesModal } from './components/ui/RulesModal';
import { TodayPage } from './pages/TodayPage';
import { BracketPage } from './pages/BracketPage';
import { GoalLeadersPage } from './pages/GoalLeadersPage';
import { Home } from './pages/Home';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ThirdPlacePage } from './pages/ThirdPlacePage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const [showRules, setShowRules] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMenuHint, setShowMenuHint] = useState(
    () => localStorage.getItem(MENU_HINT_STORAGE_KEY) !== 'true'
  );

  return (
    <BrowserRouter>
      <TokenGate>
        {(user) => (
          <div className="min-h-screen bg-[#1a472a]">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0d2b16]/95 backdrop-blur border-b border-white/10">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-white/70 hover:text-white text-xl leading-none"
                    aria-label="Abrir menú"
                  >
                    ☰
                  </button>
                  <h1 className="text-[#ffd700] font-bold text-lg tracking-wide">⚽ Mundial 2026</h1>
                </div>
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

            <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Main content */}
            <main className={`max-w-lg mx-auto px-4 py-4 ${showMenuHint ? 'pb-20' : ''}`}>
              <Routes>
                <Route path="/" element={<TodayPage user={user} />} />
                <Route path="/bracket" element={<BracketPage />} />
                <Route path="/goleadores" element={<GoalLeadersPage />} />
                <Route path="/predictions" element={<Home user={user} />} />
                <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
                <Route path="/third-place" element={<ThirdPlacePage />} />
                <Route path="/admin" element={<AdminPage user={user} />} />
              </Routes>
            </main>

            {showMenuHint && (
              <BottomMenuHint
                onOpenMenu={() => setSidebarOpen(true)}
                onDismiss={() => setShowMenuHint(false)}
              />
            )}
          </div>
        )}
      </TokenGate>
    </BrowserRouter>
  );
}

export default App;
