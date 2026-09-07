// Single source of truth for the left-rail / bottom-tab nav. Adding a future
// page (per the PRD's "I will probably add more pages") is a one-line change
// here rather than touching the shell component.
export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string; // MaterialIcons name, keeps AdaptiveShell icon-library-agnostic
};

export const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { key: 'network', label: 'Network', href: '/network', icon: 'people' },
  { key: 'settings', label: 'Settings', href: '/settings', icon: 'settings' },
];
