import { useState } from 'react';

export const MENU_HINT_STORAGE_KEY = 'mundial_bottom_menu_hint_seen';

interface BottomMenuHintProps {
  onOpenMenu: () => void;
  onDismiss: () => void;
}

export function BottomMenuHint({ onOpenMenu, onDismiss }: BottomMenuHintProps) {
  const [showMessage, setShowMessage] = useState(false);

  const handleTap = () => {
    localStorage.setItem(MENU_HINT_STORAGE_KEY, 'true');
    onOpenMenu();
    setShowMessage(true);
  };

  const handleClose = () => {
    setShowMessage(false);
    onDismiss();
  };

  return (
    <>
      {!showMessage && (
        <button
          onClick={handleTap}
          className="fixed bottom-0 left-0 right-0 z-30 bg-[#0d2b16] border-t border-white/10 flex items-center justify-center gap-2 py-3 text-white/80 text-sm font-medium safe-area-pb"
        >
          <span className="text-xl">☰</span>
          <span>Toca aquí para abrir tú menú</span>
        </button>
      )}

      {showMessage && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/60"
          onClick={handleClose}
        >
          <div
            className="bg-[#0d2b16] border border-white/10 rounded-xl p-5 max-w-sm w-full text-white/90 text-sm leading-relaxed"
            onClick={(e) => e.stopPropagation()}
          >
            <p>
              Tuve que cambiar porque ya no quedaba espacio en el menú. De ahora en
              adelante el menú va a estar arriba a la izquierda, es un botón con 3
              rayitas.
            </p>
            <p className="mt-3 text-white/50 text-xs">Att. Tavi</p>
            <button
              onClick={handleClose}
              className="mt-4 w-full bg-[#ffd700] text-[#0d2b16] font-bold py-2 rounded-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
