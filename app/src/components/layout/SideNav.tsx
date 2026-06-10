import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Umbrella, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui';
import { NAV_ITEMS } from './navItems';

const STORAGE_KEY = 'nav:expanded';
/** Lighter stroke than Lucide's default 2 — matches the live app's refined icons. */
const ICON_STROKE = 1.75;

function readExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Link styling. Mobile/collapsed = centered icon square; expanded (md) = icon + label row.
 * Returns a STRING (not a render-prop) so it survives Radix's `asChild` Slot cloning —
 * a function className is dropped there, which broke both layout and the active state.
 * Active styling rides NavLink's auto-added `.active` class instead of `isActive`.
 */
function navLinkClass(expanded: boolean): string {
  return cn(
    'flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150',
    'hover:bg-white/8 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    '[&.active]:bg-nav-active/15 [&.active]:text-nav-active [&.active]:hover:bg-nav-active/15 [&.active]:hover:text-nav-active',
    expanded && 'md:h-11 md:w-full md:justify-start md:gap-3 md:px-3'
  );
}

/**
 * Persistent navigation. Vertical rail on desktop (collapsible to icons-only or
 * expanded with labels, remembered across sessions), bottom bar on mobile.
 * Lives outside the routed <Outlet/>, so it never remounts on navigation.
 */
export function SideNav() {
  const [expanded, setExpanded] = useState(readExpanded);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0');
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [expanded]);

  const label = (text: string) =>
    expanded ? (
      <span className="hidden min-w-0 flex-1 truncate text-sm font-medium md:inline">{text}</span>
    ) : null;

  return (
    <nav
      aria-label="Primary"
      data-expanded={expanded}
      className={cn(
        'z-30 flex shrink-0 bg-rail/80 backdrop-blur transition-[width] duration-200 ease-out',
        'fixed inset-x-0 bottom-0 h-16 flex-row items-center justify-around border-t border-line px-2',
        'md:static md:h-dvh md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-r md:border-t-0 md:py-5',
        expanded ? 'md:w-56 md:px-3' : 'md:w-17 md:px-3'
      )}
    >
      <NavLink
        to="/"
        aria-label="My People home"
        className="mb-6 hidden items-center gap-3 md:flex"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-canvas-deep">
          <Umbrella className="size-5" strokeWidth={ICON_STROKE} />
        </span>
        {expanded ? (
          <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-content md:inline">
            The Plan Beyond
          </span>
        ) : null}
      </NavLink>

      {NAV_ITEMS.map((item) => {
        const link = (
          <NavLink to={item.to} className={navLinkClass(expanded)} end={item.to === '/'}>
            <item.icon className="size-5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
            {label(item.label)}
            {!expanded ? <span className="sr-only">{item.label}</span> : null}
          </NavLink>
        );
        // Tooltips only when collapsed — when expanded the label is already visible.
        return expanded ? (
          <div key={item.to} className="contents">
            {link}
          </div>
        ) : (
          <Tooltip key={item.to} content={item.label} side="right">
            {link}
          </Tooltip>
        );
      })}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        aria-pressed={expanded}
        className={cn(
          'mt-auto hidden size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 md:flex',
          'hover:bg-white/8 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          expanded && 'md:h-11 md:w-full md:justify-start md:gap-3 md:px-3'
        )}
      >
        {expanded ? (
          <PanelLeftClose className="size-5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
        ) : (
          <PanelLeftOpen className="size-5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
        )}
        {expanded ? (
          <span className="hidden truncate text-sm font-medium md:inline">Collapse</span>
        ) : null}
      </button>

      <NavLink to="/profile" aria-label="Profile" className={navLinkClass(expanded)}>
        <User className="size-5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
        {label('Profile')}
      </NavLink>
    </nav>
  );
}
