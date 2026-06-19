import { useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { Button } from '../ui/Button';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const startEdit = (u: User) => {
    setEditing(u.token);
    setEditName(u.displayName);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditName('');
    setSaveError(null);
  };

  const saveName = async (token: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, 'users', token), { displayName: name });
      setUsers((prev) => prev.map((u) => u.token === token ? { ...u, displayName: name } : u));
      setEditing(null);
      setEditName('');
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
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
          <div key={u.token} className="py-2 border-b border-white/5 last:border-0">
            {editing === u.token ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName(u.token);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="flex-1 bg-white/10 text-white text-sm px-2 py-1 rounded border border-white/20 outline-none focus:border-[#ffd700]"
                  />
                  <button
                    onClick={() => saveName(u.token)}
                    disabled={saving}
                    className="text-xs text-[#ffd700] hover:text-yellow-300 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-white/40 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
                {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{u.displayName}</p>
                    <button
                      onClick={() => startEdit(u)}
                      className="text-white/30 hover:text-white/70 text-xs"
                      title="Editar nombre"
                    >
                      ✏️
                    </button>
                  </div>
                  <p className="text-white/40 text-xs font-mono">{u.token}</p>
                </div>
                <button
                  onClick={() => copyLink(u.token)}
                  className="text-xs text-[#ffd700] hover:text-yellow-300 font-medium"
                >
                  {copied === u.token ? '✅ Copiado' : '📋 Copiar enlace'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
