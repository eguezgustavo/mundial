import { NavLink } from 'react-router-dom';
import { User } from '../../types';

interface BottomNavProps {
  user: User;
}

export function BottomNav({ user }: BottomNavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 py-2 px-4 text-xs font-medium transition-colors ${
      isActive ? 'text-[#ffd700]' : 'text-white/60 hover:text-white'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0d2b16] border-t border-white/10 z-50 safe-area-pb">
      <div className="flex justify-around max-w-lg mx-auto">
        <NavLink to="/" end className={linkClass}>
          <span className="text-xl">📅</span>
          <span>Hoy</span>
        </NavLink>
        <NavLink to="/bracket" className={linkClass}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Left column - 4 boxes */}
            <rect x="1" y="1.5" width="6" height="3.5" rx="1"/>
            <rect x="1" y="7"   width="6" height="3.5" rx="1"/>
            <rect x="1" y="13.5" width="6" height="3.5" rx="1"/>
            <rect x="1" y="19"  width="6" height="3.5" rx="1"/>
            {/* Middle column - 2 boxes */}
            <rect x="9" y="4.25"  width="6" height="3.5" rx="1"/>
            <rect x="9" y="16.25" width="6" height="3.5" rx="1"/>
            {/* Connectors left→middle top pair */}
            <path d="M7 3.25 H8 Q8.5 3.25 8.5 4 V5.5 Q8.5 6 9 6"/>
            <path d="M7 8.75 H8 Q8.5 8.75 8.5 8 V6.5 Q8.5 6 9 6"/>
            {/* Connectors left→middle bottom pair */}
            <path d="M7 15.25 H8 Q8.5 15.25 8.5 16 V17.5 Q8.5 18 9 18"/>
            <path d="M7 20.75 H8 Q8.5 20.75 8.5 20 V18.5 Q8.5 18 9 18"/>
            {/* Connectors middle→right */}
            <path d="M15 6 H16 Q16.5 6 16.5 7 V12 Q16.5 17 16 17 H15"/>
            {/* Right nub */}
            <line x1="16.5" y1="12" x2="18" y2="12"/>
          </svg>
          <span>Llave</span>
        </NavLink>
        <NavLink to="/predictions" className={linkClass}>
          <span className="text-xl">⚽</span>
          <span>Tus predicciones</span>
        </NavLink>
        <NavLink to="/leaderboard" className={linkClass}>
          <span className="text-xl">🏆</span>
          <span>Posiciones</span>
        </NavLink>
        {user.isAdmin && (
          <NavLink to="/admin" className={linkClass}>
            <span className="text-xl">⚙️</span>
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
