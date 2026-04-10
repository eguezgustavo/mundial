import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { Button } from '../ui/Button';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map((d) => ({ token: d.id, ...d.data() } as User)));
    setLoaded(true);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!loaded) {
    return (
      <section className="bg-[#0d2b16] rounded-xl p-4 border border-white/10">
        <h2 className="text-white font-bold mb-3">Usuarios y enlaces de invitación</h2>
        <Button onClick={load} variant="ghost" size="sm" className="w-full border border-white/20">
          Cargar usuarios
        </Button>
      </section>
    );
  }

  return (
    <section className="bg-[#0d2b16] rounded-xl p-4 border border-white/10">
      <h2 className="text-white font-bold mb-3">Usuarios y enlaces de invitación</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.token} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div>
              <p className="text-white text-sm font-medium">{u.displayName}</p>
              <p className="text-white/40 text-xs font-mono">{u.token}</p>
            </div>
            <button
              onClick={() => copyLink(u.token)}
              className="text-xs text-[#ffd700] hover:text-yellow-300 font-medium"
            >
              {copied === u.token ? '✅ Copiado' : '📋 Copiar enlace'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
