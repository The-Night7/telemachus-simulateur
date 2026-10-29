import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

// Panneau latéral droit avec voile, fermable par la croix, un clic sur le voile ou Échap.
export function SideDrawer({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div role="dialog" aria-label={title} className="fixed top-0 right-0 h-full w-full max-w-sm bg-neutral-900 border-l border-neutral-800 z-50 shadow-2xl p-4 sm:p-6 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              {icon}
              {title}
            </h3>
            {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="-m-2 p-2 text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
