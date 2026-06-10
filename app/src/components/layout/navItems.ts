import { Home, Users, FileText, Image, PencilLine, Archive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Primary navigation. Only People is fully built; the rest are WIP routes. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/contacts', label: 'My People', icon: Users },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/photos', label: 'Photos', icon: Image },
  { to: '/notes', label: 'Notes', icon: PencilLine },
  { to: '/vault', label: 'Vault', icon: Archive },
];
