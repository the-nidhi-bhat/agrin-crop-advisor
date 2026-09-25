import { Home, ScanLine, Settings, Sprout, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from './Brand';
import { useT, type StringKey } from '../../lib/strings';

interface NavItem {
  to: string;
  labelKey: StringKey;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/scan', labelKey: 'nav.scan', icon: ScanLine },
  { to: '/health', labelKey: 'nav.health', icon: Sprout },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

const railItemClass =
  'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors duration-150';

function railClassName(isActive: boolean) {
  return `${railItemClass} ${isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-sunken hover:text-ink'}`;
}

export function AppLayout() {
  const t = useT();
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex h-dvh w-full max-w-[1280px]">
        {/* Desktop rail */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-4 py-6 lg:flex">
          <NavLink to="/" end aria-label="AgriN home">
            <Brand />
          </NavLink>
          <p className="mt-1 pl-9 text-xs text-muted">{t('layout.tagline')}</p>

          <nav aria-label={t('layout.navMain')} className="mt-8 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => railClassName(isActive)}>
                <item.icon size={20} aria-hidden />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-card border border-line bg-sunken/60 p-4">
            <p className="text-xs font-semibold text-ink">{t('layout.railTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t('layout.railCopy')}</p>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur lg:hidden">
            <NavLink to="/" end aria-label="AgriN home">
              <Brand />
            </NavLink>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
              {t('common.beta')}
            </span>
          </header>

          <main className="w-full flex-1 px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
            <div className="mx-auto w-full max-w-[1120px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label={t('layout.navMain')}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="flex flex-col items-center gap-0.5 pt-2 pb-1.5">
            {({ isActive }) => (
              <>
                {item.to === '/scan' ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-raise">
                    <item.icon size={20} aria-hidden />
                  </span>
                ) : (
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      isActive ? 'bg-primary-soft text-primary' : 'text-muted'
                    }`}
                  >
                    <item.icon size={22} aria-hidden />
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}