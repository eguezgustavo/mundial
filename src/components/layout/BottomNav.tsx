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
          <span className="text-xl">🗂️</span>
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
