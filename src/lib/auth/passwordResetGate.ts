export function isPasswordResetAllowedPath(pathname: string): boolean {
  return pathname === '/set-password'
    || pathname.startsWith('/set-password/')
    || pathname === '/logout'
    || pathname.startsWith('/logout/')
    || pathname === '/forgot-password'
    || pathname.startsWith('/forgot-password/')
    || pathname === '/reset-password'
    || pathname.startsWith('/reset-password/');
}

export function shouldEnforcePasswordReset(
  mustResetPassword: boolean | null | undefined,
  pathname: string
): boolean {
  if (!mustResetPassword) {
    return false;
  }

  return !isPasswordResetAllowedPath(pathname);
}
