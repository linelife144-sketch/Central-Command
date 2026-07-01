export const REQUIRED_PROVISIONING_COLUMNS = [
  'first_name',
  'last_name',
  'email',
  'role',
  'temp_password',
] as const;

export type ProvisioningCsvColumn = (typeof REQUIRED_PROVISIONING_COLUMNS)[number];
export type ProvisioningRole = 'CEO' | 'SUPER_ADMIN' | 'ADMIN' | 'CONTRACTOR';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEMP_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const MAX_SUPER_ADMINS = 1;

const ROLE_ALIASES: Record<string, ProvisioningRole | null> = {
  CEO: 'CEO',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPERADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CONTRACTOR: 'CONTRACTOR',
  TEAM_LEAD: 'ADMIN',
  TEAMLEAD: 'ADMIN',
  READ_ONLY: 'ADMIN',
  READONLY: 'ADMIN',
};

export interface ParsedProvisioningRow {
  lineNumber: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  temp_password: string;
}

export interface ValidatedProvisioningRow {
  lineNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  role: ProvisioningRole;
  tempPassword: string;
}

export interface ProvisioningValidationIssue {
  lineNumber: number;
  email?: string;
  reason: string;
}

export interface ParseProvisioningCsvResult {
  rows: ParsedProvisioningRow[];
  errors: string[];
}

export interface ValidateProvisioningRowsResult {
  validRows: ValidatedProvisioningRow[];
  rowIssues: ProvisioningValidationIssue[];
  warnings: string[];
}

export interface AuthUserSummary {
  id: string;
  email: string;
}

export interface AuthUserUpsertInput {
  email: string;
  tempPassword: string;
  firstName: string;
  lastName: string;
}

export interface ProfileUpsertInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ProvisioningRole;
  mustResetPassword: boolean;
}

export interface ContractorUpsertInput {
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ExistingSuperAdmin {
  id: string;
  email: string;
}

export interface ProvisioningAdapter {
  listSuperAdmins: () => Promise<ExistingSuperAdmin[]>;
  findAuthUserByEmail: (email: string) => Promise<AuthUserSummary | null>;
  createAuthUser: (input: AuthUserUpsertInput) => Promise<AuthUserSummary>;
  updateAuthUser: (userId: string, input: AuthUserUpsertInput) => Promise<void>;
  upsertProfile: (profile: ProfileUpsertInput) => Promise<void>;
  upsertContractor: (contractor: ContractorUpsertInput) => Promise<void>;
}

export interface ProvisioningRunOptions {
  apply?: boolean;
  warnings?: string[];
}

export interface ProvisioningRowOutcome {
  lineNumber: number;
  email: string;
  status: 'created' | 'updated' | 'failed';
  mode: 'dry-run' | 'applied';
  reason?: string;
}

export interface ProvisioningRunResult {
  dryRun: boolean;
  createdUsers: number;
  updatedUsers: number;
  failedRows: number;
  warnings: string[];
  outcomes: ProvisioningRowOutcome[];
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRoleToken(role: string): string {
  return role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_');
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeRole(rawRole: string): ProvisioningRole | null {
  const token = normalizeRoleToken(rawRole);
  return ROLE_ALIASES[token] ?? null;
}

function isRoleAliasWarning(rawRole: string): boolean {
  const token = normalizeRoleToken(rawRole);
  return token === 'TEAM_LEAD'
    || token === 'TEAMLEAD'
    || token === 'READ_ONLY'
    || token === 'READONLY';
}

export function parseProvisioningCsv(csvText: string): ParseProvisioningCsvResult {
  const rows: ParsedProvisioningRow[] = [];
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/);
  const nonEmptyIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim().length > 0);

  if (nonEmptyIndexes.length === 0) {
    return {
      rows: [],
      errors: ['CSV file is empty.'],
    };
  }

  const headerLine = nonEmptyIndexes[0];
  const headers = parseCsvLine(headerLine.line).map(normalizeHeader);
  const headerIndexByName = new Map<string, number>();
  headers.forEach((header, index) => {
    headerIndexByName.set(header, index);
  });

  const missingColumns = REQUIRED_PROVISIONING_COLUMNS.filter(
    (column) => !headerIndexByName.has(column),
  );

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`CSV is missing required columns: ${missingColumns.join(', ')}`],
    };
  }

  for (const { line, index } of nonEmptyIndexes.slice(1)) {
    const values = parseCsvLine(line);

    if (values.length < headers.length) {
      errors.push(`Line ${index + 1}: expected ${headers.length} columns, found ${values.length}.`);
      continue;
    }

    const getValue = (column: ProvisioningCsvColumn): string => {
      const columnIndex = headerIndexByName.get(column);
      if (columnIndex === undefined) {
        return '';
      }
      return values[columnIndex] ?? '';
    };

    rows.push({
      lineNumber: index + 1,
      first_name: getValue('first_name').trim(),
      last_name: getValue('last_name').trim(),
      email: getValue('email').trim(),
      role: getValue('role').trim(),
      temp_password: getValue('temp_password').trim(),
    });
  }

  return { rows, errors };
}

export function validateProvisioningRows(rows: ParsedProvisioningRow[]): ValidateProvisioningRowsResult {
  const validRows: ValidatedProvisioningRow[] = [];
  const rowIssues: ProvisioningValidationIssue[] = [];
  const warnings: string[] = [];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const lineIssues: string[] = [];
    const normalizedRole = normalizeRole(row.role);

    if (!row.first_name) {
      lineIssues.push('`first_name` is required.');
    }

    if (!row.last_name) {
      lineIssues.push('`last_name` is required.');
    }

    if (!email) {
      lineIssues.push('`email` is required.');
    } else if (!EMAIL_PATTERN.test(email)) {
      lineIssues.push('`email` must be a valid email address.');
    }

    if (!row.temp_password) {
      lineIssues.push('`temp_password` is required.');
    } else if (!TEMP_PASSWORD_PATTERN.test(row.temp_password)) {
      lineIssues.push('`temp_password` must be 12+ chars with uppercase, lowercase, number, and special character.');
    }

    if (!row.role) {
      lineIssues.push('`role` is required.');
    } else if (!normalizedRole) {
      lineIssues.push('`role` must resolve to CEO, SUPER_ADMIN, ADMIN, or CONTRACTOR.');
    }

    if (email && seenEmails.has(email)) {
      lineIssues.push('Duplicate email in CSV.');
    }

    if (lineIssues.length > 0 || !normalizedRole || !email) {
      rowIssues.push({
        lineNumber: row.lineNumber,
        email: email || undefined,
        reason: lineIssues.join(' '),
      });
      continue;
    }

    if (isRoleAliasWarning(row.role)) {
      warnings.push(
        `Line ${row.lineNumber}: role "${row.role}" was normalized to "${normalizedRole}".`,
      );
    }

    seenEmails.add(email);
    validRows.push({
      lineNumber: row.lineNumber,
      firstName: row.first_name,
      lastName: row.last_name,
      email,
      role: normalizedRole,
      tempPassword: row.temp_password,
    });
  }

  return { validRows, rowIssues, warnings };
}

function resolveSuperAdminLimitReason(
  row: ValidatedProvisioningRow,
  activeSuperAdminEmails: Set<string>,
): string | null {
  if (row.role !== 'SUPER_ADMIN') {
    return null;
  }

  if (activeSuperAdminEmails.has(row.email)) {
    return null;
  }

  if (activeSuperAdminEmails.size < MAX_SUPER_ADMINS) {
    return null;
  }

  return `SUPER_ADMIN limit reached (${MAX_SUPER_ADMINS} max).`;
}

export async function runProvisioning(
  rows: ValidatedProvisioningRow[],
  adapter: ProvisioningAdapter,
  options: ProvisioningRunOptions = {},
): Promise<ProvisioningRunResult> {
  const apply = options.apply === true;
  const warnings = [...(options.warnings ?? [])];
  const outcomes: ProvisioningRowOutcome[] = [];

  let createdUsers = 0;
  let updatedUsers = 0;
  let failedRows = 0;

  const existingSuperAdmins = await adapter.listSuperAdmins();
  if (existingSuperAdmins.length > MAX_SUPER_ADMINS) {
    warnings.push(
      `Security warning: ${existingSuperAdmins.length} SUPER_ADMIN profiles already exist before provisioning.`,
    );
  }

  const activeSuperAdminEmails = new Set(
    existingSuperAdmins
      .map((admin) => admin.email?.toLowerCase())
      .filter((email): email is string => typeof email === 'string' && email.length > 0),
  );

  for (const row of rows) {
    const superAdminLimitReason = resolveSuperAdminLimitReason(row, activeSuperAdminEmails);
    if (superAdminLimitReason) {
      failedRows += 1;
      outcomes.push({
        lineNumber: row.lineNumber,
        email: row.email,
        status: 'failed',
        mode: apply ? 'applied' : 'dry-run',
        reason: superAdminLimitReason,
      });
      warnings.push(`Line ${row.lineNumber}: ${superAdminLimitReason}`);
      continue;
    }

    if (row.role === 'SUPER_ADMIN') {
      activeSuperAdminEmails.add(row.email);
    }

    try {
      const existingAuthUser = await adapter.findAuthUserByEmail(row.email);
      const status: ProvisioningRowOutcome['status'] = existingAuthUser ? 'updated' : 'created';

      if (!apply) {
        if (status === 'created') {
          createdUsers += 1;
        } else {
          updatedUsers += 1;
        }

        outcomes.push({
          lineNumber: row.lineNumber,
          email: row.email,
          status,
          mode: 'dry-run',
        });
        continue;
      }

      let authUserId = existingAuthUser?.id;
      const authInput: AuthUserUpsertInput = {
        email: row.email,
        tempPassword: row.tempPassword,
        firstName: row.firstName,
        lastName: row.lastName,
      };

      if (existingAuthUser) {
        await adapter.updateAuthUser(existingAuthUser.id, authInput);
        updatedUsers += 1;
      } else {
        const createdUser = await adapter.createAuthUser(authInput);
        authUserId = createdUser.id;
        createdUsers += 1;
      }

      if (!authUserId) {
        throw new Error('Auth user id was not resolved.');
      }

      await adapter.upsertProfile({
        id: authUserId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        mustResetPassword: true,
      });

      if (row.role === 'CONTRACTOR') {
        await adapter.upsertContractor({
          profileId: authUserId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
        });
      }

      outcomes.push({
        lineNumber: row.lineNumber,
        email: row.email,
        status,
        mode: 'applied',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown provisioning error.';
      failedRows += 1;
      outcomes.push({
        lineNumber: row.lineNumber,
        email: row.email,
        status: 'failed',
        mode: apply ? 'applied' : 'dry-run',
        reason,
      });
    }
  }

  return {
    dryRun: !apply,
    createdUsers,
    updatedUsers,
    failedRows,
    warnings,
    outcomes,
  };
}
