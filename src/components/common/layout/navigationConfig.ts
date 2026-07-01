export type NavigationSignalKey = 'tickets' | 'reviews' | 'storms' | 'sync' | 'conflicts';

export interface NavLinkItem {
  href: string;
  label: string;
  mobileLabel?: string;
  matchPaths?: string[];
  signalKey?: NavigationSignalKey;
  badgeStyle?: 'count' | 'dot';
}

export const ADMIN_SIDEBAR_NAV_ITEMS: NavLinkItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    matchPaths: ['/admin/admin/dashboard'],
    signalKey: 'reviews',
    badgeStyle: 'count',
  },
  {
    href: '/admin/storms/create',
    label: 'Storm Events',
    matchPaths: ['/admin/admin/storms/create'],
    signalKey: 'storms',
    badgeStyle: 'count',
  },
  { href: '/tickets', label: 'Tickets', signalKey: 'tickets', badgeStyle: 'count' },
  {
    href: '/admin/contractors',
    label: 'Users',
    matchPaths: ['/admin/admin/contractors'],
  },
  { href: '/admin/time-review', label: 'Time Review', signalKey: 'reviews', badgeStyle: 'count' },
  { href: '/admin/expense-review', label: 'Expenses', signalKey: 'reviews', badgeStyle: 'count' },
  { href: '/admin/assessment-review', label: 'Assessments', signalKey: 'reviews', badgeStyle: 'count' },
  { href: '/admin/invoice-generation', label: 'Invoices' },
  { href: '/admin/reports', label: 'Reports' },
  {
    href: '/admin/account',
    label: 'Account',
    matchPaths: ['/admin/admin/account'],
  },
  { href: '/admin/map', label: 'Map View' },
];

export const CONTRACTOR_SIDEBAR_NAV_ITEMS: NavLinkItem[] = [
  { href: '/tickets', label: 'My Tickets', signalKey: 'tickets', badgeStyle: 'count' },
  { href: '/contractor/map', label: 'Map' },
  { href: '/contractor/time', label: 'Time Tracking', signalKey: 'sync', badgeStyle: 'dot' },
  { href: '/contractor/expenses', label: 'Expenses', signalKey: 'sync', badgeStyle: 'dot' },
  { href: '/contractor/assessments/create', label: 'Assessments', signalKey: 'reviews', badgeStyle: 'dot' },
  { href: '/contractor/invoices', label: 'Invoices' },
  { href: '/contractor/account', label: 'Account' },
];

export const ADMIN_BOTTOM_NAV_ITEMS: NavLinkItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    mobileLabel: 'Home',
    matchPaths: ['/admin/admin/dashboard'],
    signalKey: 'reviews',
    badgeStyle: 'dot',
  },
  { href: '/tickets', label: 'Tickets', signalKey: 'tickets', badgeStyle: 'count' },
  {
    href: '/admin/contractors',
    label: 'Users',
    matchPaths: ['/admin/admin/contractors'],
  },
  { href: '/admin/map', label: 'Map' },
];

export const CONTRACTOR_BOTTOM_NAV_ITEMS: NavLinkItem[] = [
  { href: '/tickets', label: 'Tickets', signalKey: 'tickets', badgeStyle: 'count' },
  { href: '/contractor/map', label: 'Map' },
  { href: '/contractor/time', label: 'Time', signalKey: 'sync', badgeStyle: 'dot' },
];
