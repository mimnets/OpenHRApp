/**
 * Hash-based deep linking utility for authenticated routes.
 *
 * OpenHRApp uses React state-based routing (currentPath in App.tsx) with no URL
 * representation for authenticated pages. This module adds hash-based routing
 * so that authenticated pages are shareable, bookmarkable, and support browser
 * back/forward — without a full React Router migration.
 *
 * Public pages (landing, blog, tutorials, privacy, terms, features, changelog,
 * about) already use clean URL paths via navigateTo() in seo.ts and are NOT
 * affected by this module.
 *
 * ## How it works
 *
 * 1. On programmatic navigation (sidebar click), App.tsx calls navigateToRoute()
 *    which sets window.location.hash. This creates a browser history entry and
 *    fires hashchange synchronously.
 * 2. The hashchange listener in App.tsx calls getCurrentRoute() to parse the
 *    hash back into an internal route, then updates React state.
 * 3. On mount after auth, App.tsx reads the initial hash and navigates to it.
 * 4. Browser back/forward fires hashchange naturally — the listener handles it.
 *
 * React deduplicates same-value state updates, so the synchronous hashchange
 * fire from step 1 doesn't cause a double render.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeepLinkRoute {
  /** Internal currentPath value (e.g. 'employees', 'attendance-logs') */
  path: string;
  /** Extracted parameters (e.g. { id: 'abc-123' }), or null if none */
  params: Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Forward map: hash patterns → internal routes
// ---------------------------------------------------------------------------

interface RouteEntry {
  /** Compiled regex for matching hash fragments */
  regex: RegExp;
  /** Internal currentPath to set */
  path: string;
  /** Names of captured params in regex order */
  paramNames: string[];
}

/**
 * Ordered route table. More-specific patterns MUST come before less-specific
 * ones because matching stops at the first hit.
 *
 * Examples:
 *   #/employee/abc123    → { path: 'employees', params: { selectedEmployeeId: 'abc123' } }
 *   #/employees          → { path: 'employees', params: null }
 *   #/attendance/quick-office → { path: 'attendance', params: { autoStart: 'OFFICE' } }
 */
const ROUTE_TABLE: RouteEntry[] = [
  // -- Employee directory --
  { regex: /^#\/employee\/([^/]+)$/,         path: 'employees',        paramNames: ['selectedEmployeeId'] },
  { regex: /^#\/employees\/?$/,              path: 'employees',        paramNames: [] },

  // -- Attendance clock-in shortcuts (must be before generic attendance) --
  { regex: /^#\/attendance\/quick-office\/?$/, path: 'attendance',     paramNames: [] },  // params set in reverse map
  { regex: /^#\/attendance\/quick-factory\/?$/,path: 'attendance',     paramNames: [] },
  { regex: /^#\/attendance\/finish\/?$/,      path: 'attendance',      paramNames: [] },
  { regex: /^#\/attendance\/clock-in\/?$/,    path: 'attendance',      paramNames: [] },

  // -- Attendance logs (specific employee) --
  { regex: /^#\/attendance\/([^/]+)$/,        path: 'attendance-logs', paramNames: ['filterEmployeeId'] },
  // -- Attendance logs (own) --
  { regex: /^#\/attendance\/?$/,              path: 'attendance-logs', paramNames: [] },

  // -- Attendance audit --
  { regex: /^#\/attendance-audit\/?$/,        path: 'attendance-audit', paramNames: [] },

  // -- Leave (specific request) --
  { regex: /^#\/leave\/([^/]+)$/,             path: 'leave',           paramNames: ['openLeaveId'] },
  // -- Leave list --
  { regex: /^#\/leaves\/?$/,                  path: 'leave',           paramNames: [] },

  // -- Simple static routes --
  { regex: /^#\/dashboard\/?$/,               path: 'dashboard',       paramNames: [] },
  { regex: /^#\/reviews\/?$/,                 path: 'performance-review', paramNames: [] },
  { regex: /^#\/reports\/?$/,                 path: 'reports',         paramNames: [] },
  { regex: /^#\/announcements\/?$/,           path: 'announcements',   paramNames: [] },
  { regex: /^#\/admin-notifications\/?$/,     path: 'admin-notifications', paramNames: [] },
  { regex: /^#\/organization\/?$/,            path: 'organization',    paramNames: [] },
  { regex: /^#\/settings\/?$/,                path: 'settings',        paramNames: [] },
  { regex: /^#\/profile\/?$/,                 path: 'profile',         paramNames: [] },
  { regex: /^#\/upgrade\/?$/,                 path: 'upgrade',         paramNames: [] },
];

// ---------------------------------------------------------------------------
// Reverse map: internal path + params → hash fragment
// ---------------------------------------------------------------------------

/**
 * Build a hash fragment from an internal path and optional params.
 * Returns null when the path has no deep-link representation.
 */
type HashBuilder = (params: Record<string, any> | null | undefined) => string | null;

const REVERSE_MAP: Record<string, HashBuilder> = {
  'dashboard':            () => '#/dashboard',
  'employees':            (p) => p?.selectedEmployeeId ? `#/employee/${p.selectedEmployeeId}` : '#/employees',
  'attendance':           (p) => {
    if (!p || !p.autoStart) return '#/attendance/clock-in';
    switch (p.autoStart) {
      case 'OFFICE':  return '#/attendance/quick-office';
      case 'FACTORY': return '#/attendance/quick-factory';
      case 'FINISH':  return '#/attendance/finish';
      default:        return '#/attendance/clock-in';
    }
  },
  'attendance-logs':      (p) => p?.filterEmployeeId ? `#/attendance/${p.filterEmployeeId}` : '#/attendance',
  'attendance-audit':     () => '#/attendance-audit',
  'leave':                (p) => p?.openLeaveId ? `#/leave/${p.openLeaveId}` : '#/leaves',
  'performance-review':   () => '#/reviews',
  'reports':              () => '#/reports',
  'announcements':        () => '#/announcements',
  'admin-notifications':  () => '#/admin-notifications',
  'organization':         () => '#/organization',
  'settings':             () => '#/settings',
  'profile':              () => '#/profile',
  'upgrade':              () => '#/upgrade',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse the current window.location.hash into a DeepLinkRoute.
 * Returns null when:
 *  - The hash is empty, just '#', or just '#/'
 *  - The hash matches no known route pattern
 *  - The hash looks like a verification / password-reset token (Supabase auth)
 */
export function getCurrentRoute(): DeepLinkRoute | null {
  return parseHash(window.location.hash);
}

/**
 * Navigate to an internal route by updating window.location.hash.
 * Creates a browser history entry so back/forward works.
 *
 * Call this from App.tsx handleNavigate() alongside setCurrentPath().
 */
export function navigateToRoute(path: string, params?: Record<string, any> | null): void {
  const hash = buildHash(path, params);
  if (hash && window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

/**
 * Replace the current hash without adding a browser history entry.
 * Used for initial sync on app mount so the default page doesn't
 * create a dummy history entry.
 */
export function replaceRoute(path: string, params?: Record<string, any> | null): void {
  const hash = buildHash(path, params);
  if (hash && window.location.hash !== hash) {
    // Build the full URL with the new hash, then replaceState
    const url = window.location.pathname + window.location.search + hash;
    window.history.replaceState(null, '', url);
  }
}

/**
 * Build the hash string for a given internal path + params.
 * Returns null if the path has no hash representation.
 */
export function buildHash(path: string, params?: Record<string, any> | null): string | null {
  const builder = REVERSE_MAP[path];
  if (!builder) return null;
  return builder(params);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Match a raw hash string against the route table.
 * The hash may include query-like fragments (e.g. '#/route?foo=bar')
 * which are stripped before matching.
 */
function parseHash(raw: string): DeepLinkRoute | null {
  // Normalize: strip leading '#', strip query/search suffix, trim
  let hash = raw.replace(/^#/, '').replace(/[?#].*$/, '').trim();

  // Empty or root hash → no route
  if (!hash || hash === '/') return null;

  // Ensure leading slash for consistency
  if (!hash.startsWith('/')) {
    hash = '/' + hash;
  }

  // Remove trailing slash for consistent matching (patterns are slash-agnostic)
  hash = hash.replace(/\/+$/, '');

  // Guard: don't parse Supabase auth hashes
  if (hash.includes('token=') || hash.startsWith('/auth/')) return null;
  if (hash.includes('type=recovery')) return null;
  if (hash.includes('error=')) return null;

  // Match against route table (first-match wins)
  for (const entry of ROUTE_TABLE) {
    const match = hash.match(entry.regex);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < entry.paramNames.length; i++) {
        params[entry.paramNames[i]] = match[i + 1]; // match[0] is full string
      }
      return {
        path: entry.path,
        params: Object.keys(params).length > 0 ? params : null,
      };
    }
  }

  return null;
}
