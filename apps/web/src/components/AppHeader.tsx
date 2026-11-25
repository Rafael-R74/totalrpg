import { useEffect, useRef, useState } from 'react';
import { SystemId } from '@totalrpg/shared';
import { BrandMark, SystemSigilBadge } from './BrandMark';
import { Icon } from './ui/Icon';

export interface Crumb {
  label: string;
  onClick?: () => void;
}

interface AppHeaderProps {
  username: string;
  isAdmin?: boolean;
  crumbs: Crumb[];
  system?: SystemId | null;
  onHome: () => void;
  onOpenAppearance: () => void;
  onOpenAdminOverview?: () => void;
  onLogout: () => void;
}

export function AppHeader({
  username,
  isAdmin,
  crumbs,
  system,
  onHome,
  onOpenAppearance,
  onOpenAdminOverview,
  onLogout,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(ev: MouseEvent | KeyboardEvent) {
      if (ev instanceof KeyboardEvent) {
        if (ev.key === 'Escape') setMenuOpen(false);
        return;
      }
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/92 backdrop-blur-md">
      <div className="trpg-wrap h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="shrink-0 rounded-md -ml-1 px-1 py-1"
          aria-label="Ir para o início"
        >
          <BrandMark size="md" compactOnMobile={crumbs.length > 0} />
        </button>

        {crumbs.length > 0 && (
          <nav aria-label="Você está em" className="min-w-0 flex items-center gap-1 text-sm">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  <Icon name="chevron-down" size={14} className="-rotate-90 text-zinc-600 shrink-0" />
                  {c.onClick && !isLast ? (
                    <button
                      type="button"
                      onClick={c.onClick}
                      className="truncate rounded px-1.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span className="truncate px-1.5 py-1 font-semibold text-zinc-100" aria-current={isLast ? 'page' : undefined}>
                      {c.label}
                    </span>
                  )}
                </span>
              );
            })}
            {system && (
              <span className="hidden md:inline-flex ml-2">
                <SystemSigilBadge system={system} />
              </span>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isAdmin && onOpenAdminOverview && (
            <button
              type="button"
              onClick={onOpenAdminOverview}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-amber-700/60 bg-amber-950/35 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-900/45 transition cursor-pointer mr-1"
              title="Abrir Painel de Admin Geral"
            >
              <Icon name="activity" size={14} className="text-amber-400" />
              Admin
            </button>
          )}
          <button type="button" onClick={onOpenAppearance} className="trpg-icon-btn" aria-label="Aparência" title="Aparência">
            <Icon name="palette" size={19} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-md pl-1 pr-2 py-1 hover:bg-zinc-800"
            >
              <span className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-100 grid place-items-center">
                {initials}
              </span>
              <span className="hidden sm:block text-sm font-medium text-zinc-200 max-w-[10rem] truncate">{username}</span>
              <Icon name="chevron-down" size={14} className="text-zinc-500" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
              >
                <div className="px-3 py-2 text-xs text-zinc-400 flex items-center justify-between gap-2">
                  <span className="truncate">
                    Conectado como <span className="text-zinc-100 font-semibold">{username}</span>
                  </span>
                  {isAdmin && (
                    <span className="shrink-0 rounded bg-amber-950/70 border border-amber-700/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Admin
                    </span>
                  )}
                </div>
                {isAdmin && onOpenAdminOverview && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdminOverview();
                    }}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40"
                  >
                    <Icon name="activity" size={16} className="text-amber-400" /> Painel Admin Geral
                  </button>
                )}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAppearance();
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  <Icon name="palette" size={16} /> Aparência
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-red-950/60 hover:text-red-200"
                >
                  <Icon name="logout" size={16} /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
