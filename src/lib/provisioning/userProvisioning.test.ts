import { describe, expect, it } from 'vitest';
import {
  parseProvisioningCsv,
  validateProvisioningRows,
} from './userProvisioning';

describe('parseProvisioningCsv', () => {
  it('parses required columns and rows', () => {
    const csv = [
      'first_name,last_name,email,role,temp_password',
      'Alice,Cooper,alice@example.com,CONTRACTOR,Temp1234!Temp',
    ].join('\n');

    const result = parseProvisioningCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      first_name: 'Alice',
      last_name: 'Cooper',
      email: 'alice@example.com',
      role: 'CONTRACTOR',
    });
  });

  it('fails when required headers are missing', () => {
    const csv = [
      'first_name,last_name,email,role',
      'Alice,Cooper,alice@example.com,CONTRACTOR',
    ].join('\n');

    const result = parseProvisioningCsv(csv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain('missing required columns');
  });
});

describe('validateProvisioningRows', () => {
  it('accepts CEO as a valid role', () => {
    const rows = [
      {
        lineNumber: 2,
        first_name: 'Jeanie',
        last_name: 'Campbell',
        email: 'jcampbell@example.com',
        role: 'CEO',
        temp_password: 'Temp1234!Temp',
      },
    ];

    const result = validateProvisioningRows(rows);

    expect(result.rowIssues).toEqual([]);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].role).toBe('CEO');
  });

  it('normalizes supported legacy roles and emits warnings', () => {
    const rows = [
      {
        lineNumber: 2,
        first_name: 'Sam',
        last_name: 'Lee',
        email: 'sam@example.com',
        role: 'team_lead',
        temp_password: 'Temp1234!Temp',
      },
    ];

    const result = validateProvisioningRows(rows);

    expect(result.rowIssues).toEqual([]);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].role).toBe('ADMIN');
    expect(result.warnings[0]).toContain('normalized');
  });

  it('flags invalid rows and duplicate emails', () => {
    const rows = [
      {
        lineNumber: 2,
        first_name: '',
        last_name: 'Lee',
        email: 'bad-email',
        role: 'UNKNOWN',
        temp_password: 'short',
      },
      {
        lineNumber: 3,
        first_name: 'Alex',
        last_name: 'Lee',
        email: 'alex@example.com',
        role: 'CONTRACTOR',
        temp_password: 'Temp1234!Temp',
      },
      {
        lineNumber: 4,
        first_name: 'Alex',
        last_name: 'Lee',
        email: 'alex@example.com',
        role: 'CONTRACTOR',
        temp_password: 'Temp1234!Temp',
      },
    ];

    const result = validateProvisioningRows(rows);

    expect(result.validRows).toHaveLength(1);
    expect(result.rowIssues).toHaveLength(2);
    expect(result.rowIssues[0].reason).toContain('`first_name` is required');
    expect(result.rowIssues[1].reason).toContain('Duplicate email');
  });
});
