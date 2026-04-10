import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

interface TokenGateProps {
  children: (user: NonNullable<ReturnType<typeof useAuth>['user']>) => React.ReactNode;
}

export function TokenGate({ children }: TokenGateProps) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a472a] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-white mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a472a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-white mb-2">Mundial 2026</h1>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a472a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-white mb-2">Mundial 2026</h1>
          <p className="text-white/70 text-sm">Necesitas un enlace de invitación para acceder.</p>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}
