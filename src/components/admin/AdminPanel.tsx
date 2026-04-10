import { UserList } from './UserList';

export function AdminPanel() {
  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl p-4">
        <p className="text-[#ffd700] text-sm font-medium mb-1">Los datos son gestionados por la app Python</p>
        <p className="text-white/60 text-xs leading-relaxed">
          Run <code className="bg-white/10 px-1 rounded">python main.py sync-matches</code> to import fixtures,{' '}
          <code className="bg-white/10 px-1 rounded">sync-results</code> after match days, and{' '}
          <code className="bg-white/10 px-1 rounded">process-scores</code> to award points.
        </p>
      </div>

      {/* User list with invite links */}
      <UserList />
    </div>
  );
}
