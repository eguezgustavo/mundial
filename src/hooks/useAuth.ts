import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

const TOKEN_KEY = 'mundial_token';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Check URL for token first
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      const token = urlToken ?? localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', token));
        if (userDoc.exists()) {
          const data = userDoc.data() as Omit<User, 'token'>;
          setUser({ token, ...data });
          localStorage.setItem(TOKEN_KEY, token);
          // Clean token from URL without reload
          if (urlToken) {
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url.toString());
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setError('Enlace de invitación inválido. Solicita uno nuevo.');
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Error al validar el acceso. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return { user, loading, error, logout };
}
