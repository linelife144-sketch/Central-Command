import { describe, expect, it, vi } from 'vitest';
import {
  type ProvisioningAdapter,
  runProvisioning,
  type ValidatedProvisioningRow,
} from './userProvisioning';

function buildAdapter(overrides: Partial<ProvisioningAdapter> = {}): ProvisioningAdapter {
  return {
    listSuperAdmins: vi.fn(async () => []),
    findAuthUserByEmail: vi.fn(async () => null),
    createAuthUser: vi.fn(async ({ email }) => ({
      id: `auth-${email}`,
      email,
    })),
    updateAuthUser: vi.fn(async () => undefined),
    upsertProfile: vi.fn(async () => undefined),
    upsertContractor: vi.fn(async () => undefined),
    ...overrides,
  };
}

function row(partial: Partial<ValidatedProvisioningRow>): ValidatedProvisioningRow {
  return {
    lineNumber: partial.lineNumber ?? 2,
    firstName: partial.firstName ?? 'Alex',
    lastName: partial.lastName ?? 'Smith',
    email: partial.email ?? 'alex@example.com',
    role: partial.role ?? 'CONTRACTOR',
    tempPassword: partial.tempPassword ?? 'Temp1234!Temp',
  };
}

describe('runProvisioning', () => {
  it('creates auth user, profile, and contractor record for contractor rows', async () => {
    const adapter = buildAdapter();
    const result = await runProvisioning([row({})], adapter, { apply: true });

    expect(result.failedRows).toBe(0);
    expect(result.createdUsers).toBe(1);
    expect(result.updatedUsers).toBe(0);
    expect(adapter.createAuthUser).toHaveBeenCalledTimes(1);
    expect(adapter.upsertProfile).toHaveBeenCalledTimes(1);
    expect(adapter.upsertContractor).toHaveBeenCalledTimes(1);
  });

  it('reconciles existing auth user without creating a new one', async () => {
    const adapter = buildAdapter({
      findAuthUserByEmail: vi.fn(async (email: string) => ({ id: `existing-${email}`, email })),
    });

    const result = await runProvisioning([row({ role: 'ADMIN' })], adapter, { apply: true });

    expect(result.createdUsers).toBe(0);
    expect(result.updatedUsers).toBe(1);
    expect(adapter.createAuthUser).not.toHaveBeenCalled();
    expect(adapter.updateAuthUser).toHaveBeenCalledTimes(1);
    expect(adapter.upsertContractor).not.toHaveBeenCalled();
  });

  it('blocks super admin creation when one super admin already exists', async () => {
    const adapter = buildAdapter({
      listSuperAdmins: vi.fn(async () => [{ id: 'sa-1', email: 'founder@grid.com' }]),
    });

    const result = await runProvisioning(
      [row({ email: 'ops@grid.com', role: 'SUPER_ADMIN' })],
      adapter,
      { apply: true },
    );

    expect(result.createdUsers).toBe(0);
    expect(result.updatedUsers).toBe(0);
    expect(result.failedRows).toBe(1);
    expect(result.outcomes[0].reason).toContain('SUPER_ADMIN limit reached');
  });

  it('blocks super admin creation when max super admin count is already reached', async () => {
    const adapter = buildAdapter({
      listSuperAdmins: vi.fn(async () => [
        { id: 'sa-1', email: 'founder@grid.com' },
        { id: 'sa-2', email: 'ops@grid.com' },
      ]),
    });

    const result = await runProvisioning(
      [row({ email: 'third@grid.com', role: 'SUPER_ADMIN' })],
      adapter,
      { apply: true },
    );

    expect(result.createdUsers).toBe(0);
    expect(result.updatedUsers).toBe(0);
    expect(result.failedRows).toBe(1);
    expect(result.outcomes[0].reason).toContain('SUPER_ADMIN limit reached');
  });

  it('supports dry-run without mutating records', async () => {
    const adapter = buildAdapter();
    const result = await runProvisioning([row({})], adapter, { apply: false });

    expect(result.dryRun).toBe(true);
    expect(result.createdUsers).toBe(1);
    expect(adapter.createAuthUser).not.toHaveBeenCalled();
    expect(adapter.upsertProfile).not.toHaveBeenCalled();
    expect(adapter.upsertContractor).not.toHaveBeenCalled();
  });
});
