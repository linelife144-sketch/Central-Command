import { describe, expect, it } from 'vitest';
import { isPasswordResetAllowedPath, shouldEnforcePasswordReset } from './passwordResetGate';

describe('isPasswordResetAllowedPath', () => {
  it('allows password setup and recovery routes', () => {
    expect(isPasswordResetAllowedPath('/set-password')).toBe(true);
    expect(isPasswordResetAllowedPath('/set-password/extra')).toBe(true);
    expect(isPasswordResetAllowedPath('/forgot-password')).toBe(true);
    expect(isPasswordResetAllowedPath('/reset-password')).toBe(true);
    expect(isPasswordResetAllowedPath('/logout')).toBe(true);
  });

  it('rejects non-utility routes', () => {
    expect(isPasswordResetAllowedPath('/admin/dashboard')).toBe(false);
    expect(isPasswordResetAllowedPath('/contractor/time')).toBe(false);
  });
});

describe('shouldEnforcePasswordReset', () => {
  it('enforces reset for protected routes when reset is required', () => {
    expect(shouldEnforcePasswordReset(true, '/admin/dashboard')).toBe(true);
    expect(shouldEnforcePasswordReset(true, '/contractor/time')).toBe(true);
  });

  it('does not enforce reset on allowed utility paths', () => {
    expect(shouldEnforcePasswordReset(true, '/set-password')).toBe(false);
    expect(shouldEnforcePasswordReset(true, '/forgot-password')).toBe(false);
    expect(shouldEnforcePasswordReset(true, '/reset-password')).toBe(false);
  });

  it('does not enforce reset when flag is falsey', () => {
    expect(shouldEnforcePasswordReset(false, '/admin/dashboard')).toBe(false);
    expect(shouldEnforcePasswordReset(null, '/admin/dashboard')).toBe(false);
    expect(shouldEnforcePasswordReset(undefined, '/admin/dashboard')).toBe(false);
  });
});
