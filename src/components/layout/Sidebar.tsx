import { NavLink } from 'react-router-dom';
import { User } from '../../types';

interface SidebarProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-[#ffd700]/10 text-[#ffd700]' : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0d2b16] border-r border-white/10 z-50 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-[#ffd700] font-bold text-lg tracking-wide">⚽ Mundial 2026</span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-2xl leading-none"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <NavLink to="/" end className={linkClass} onClick={onClose}>
            <span className="text-xl">📅</span>
            <span>Hoy</span>
          </NavLink>

          <NavLink to="/bracket" className={linkClass} onClick={onClose}>
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

          <NavLink to="/goleadores" className={linkClass} onClick={onClose}>
            <span className="text-xl">🥅</span>
            <span>Goleadores</span>
          </NavLink>

          <NavLink to="/predictions" className={linkClass} onClick={onClose}>
            <span className="text-xl">⚽</span>
            <span>Tus predicciones</span>
          </NavLink>

          <NavLink to="/leaderboard" className={linkClass} onClick={onClose}>
            <span className="text-xl">🏆</span>
            <span>Posiciones</span>
          </NavLink>

          {user.isAdmin && (
            <NavLink to="/admin" className={linkClass} onClick={onClose}>
              <span className="text-xl">⚙️</span>
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}
