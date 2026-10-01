import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPasswordResetAllowedPath, shouldEnforcePasswordReset } from '@/lib/auth/passwordResetGate';
import { isSuperAdminTestingEnabled } from '@/lib/testing/superAdminTesting';

const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/magic-link',
  '/auth/confirm',  // PKCE magic-link callback — must be public
  '/forbidden',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it very hard to debug
  // why your users are signed out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  function redirectWithSession(url: URL) {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const pathname = request.nextUrl.pathname;

  // Let static assets, API routes, manifest, and service worker pass through
  if (
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/templates/')
  ) {
    return supabaseResponse;
  }

  // Redirect legacy bookmarks to canonical contractor routes.
  if (pathname === '/subcontractor' || pathname.startsWith('/subcontractor/')) {
    const contractorUrl = request.nextUrl.clone();
    contractorUrl.pathname = pathname.replace(/^\/subcontractor/, '/contractor');
    return redirectWithSession(contractorUrl);
  }

  if (pathname === '/admin/subcontractors' || pathname.startsWith('/admin/subcontractors/')) {
    const contractorUrl = request.nextUrl.clone();
    contractorUrl.pathname = pathname.replace(/^\/admin\/subcontractors/, '/admin/contractors');
    return redirectWithSession(contractorUrl);
  }

  // Development Auth Bypass: bypass login and open app directly to dashboard
  const DEV_BYPASS_AUTH = isSuperAdminTestingEnabled();
  if (DEV_BYPASS_AUTH) {
    if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/magic-link' || pathname === '/') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/admin/dashboard';
      dashboardUrl.search = '';
      return redirectWithSession(dashboardUrl);
    }
    return supabaseResponse;
  }

  // If NOT authenticated
  if (!user) {
    // If attempting to access a non-public route, redirect to login
    if (!isPublicRoute(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      // Save original URL as redirect parameter if it's not root
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return redirectWithSession(loginUrl);
    }
    return supabaseResponse;
  }

  // If authenticated
  // Fetch user profile to check role
  const { data: profile, error } = (await supabase
    .from('profiles')
    .select('role, is_active, must_reset_password')
    .eq('id', user.id)
    .single()) as any;

  if (error || !profile || !profile.is_active) {
    // If profile fetching fails, sign them out and redirect to login
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return redirectWithSession(loginUrl);
  }

  const role = profile.role;
  const isAdminRole = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'CEO';
  const isContractorRole = role === 'CONTRACTOR';

  // If user must set/reset password, ensure they stay on or get directed to /set-password
  if (shouldEnforcePasswordReset(profile.must_reset_password, pathname)) {
    const setPasswordUrl = request.nextUrl.clone();
    setPasswordUrl.pathname = '/set-password';
    return redirectWithSession(setPasswordUrl);
  }

  // Allow password setup/recovery routes and auth confirmation to proceed without dashboard redirect
  if (isPasswordResetAllowedPath(pathname) || pathname === '/auth/confirm') {
    return supabaseResponse;
  }

  // Handle redirect if user is on public routes (like login or root page)
  if (pathname === '/' || isPublicRoute(pathname)) {
    const targetUrl = request.nextUrl.clone();
    if (isAdminRole) {
      targetUrl.pathname = '/admin/dashboard';
    } else if (isContractorRole) {
      targetUrl.pathname = '/contractor/time';
    } else {
      // Unknown/fallback role
      targetUrl.pathname = '/forbidden';
    }
    targetUrl.search = '';
    return redirectWithSession(targetUrl);
  }

  // Check role-based route permissions
  if (pathname.startsWith('/admin/') && !isAdminRole) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = '/forbidden';
    return redirectWithSession(forbiddenUrl);
  }

  if (pathname.startsWith('/contractor/') && !isContractorRole) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = '/forbidden';
    return redirectWithSession(forbiddenUrl);
  }

  return supabaseResponse;
}
