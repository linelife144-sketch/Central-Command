import { describe, expect, it } from 'vitest';
import {
  getContractorTeamInitials,
  getOperationalMemberCode,
  validateOperationalTeam,
  type OperationalTeamDraft,
} from './contractorTeams';

const member = (id: string, firstName: string, lastName: string, role: string) => ({
  id,
  firstName,
  lastName,
  role,
  isActive: true,
  eligible: true,
});

function completeTeam(crewCount = 1): OperationalTeamDraft {
  return {
    teamLead: member('tl', 'John', 'Smith', 'TEAM_LEAD'),
    leadDriver: member('tld', 'Jane', 'Doe', 'DRIVER'),
    crews: Array.from({ length: crewCount }, (_, index) => ({
      driver: member(`d${index}`, `Driver${index}`, 'Jones', 'DRIVER'),
      assessor: member(`a${index}`, `Assessor${index}`, 'Brown', 'DAMAGE_ASSESSER'),
    })),
  };
}

describe('operational contractor team display codes', () => {
  it('formats stable team and crew role codes with name initials', () => {
    expect(getContractorTeamInitials('John', 'Smith')).toBe('JS');
    expect(getOperationalMemberCode({ teamOrdinal: 2, slot: 'TEAM_LEAD', firstName: 'John', lastName: 'Smith' })).toBe('T2-TL-JS');
    expect(getOperationalMemberCode({ teamOrdinal: 2, crewOrdinal: 3, slot: 'CREW_DRIVER', firstName: 'Jane', lastName: 'Doe' })).toBe('T2-C3-D-JD');
    expect(getOperationalMemberCode({ teamOrdinal: 2, crewOrdinal: 3, slot: 'CREW_ASSESSOR', firstName: 'Jane', lastName: 'Doe' })).toBe('T2-C3-DA-JD');
  });

  it('validates required lead, lead driver, and complete eligible crew pairs', () => {
    expect(validateOperationalTeam(completeTeam())).toEqual([]);
    expect(validateOperationalTeam({ ...completeTeam(), teamLead: null })).toContain('Choose an eligible Team Lead.');
    expect(validateOperationalTeam({ ...completeTeam(), crews: [{ driver: null, assessor: null }] })).toEqual([
      'Crew 1 needs an eligible driver.',
      'Crew 1 needs an eligible assessor.',
    ]);
  });

  it('requires between one and ten complete crews', () => {
    expect(validateOperationalTeam(completeTeam(0))).toContain('A saved team must have between 1 and 10 complete crews.');
    expect(validateOperationalTeam(completeTeam(10))).toEqual([]);
    expect(validateOperationalTeam(completeTeam(11))).toContain('A saved team must have between 1 and 10 complete crews.');
  });

  it('rejects slot-role mismatches and ineligible/inactive contractors', () => {
    const invalid = completeTeam();
    invalid.teamLead = member('wrong-lead', 'Admin', 'Reviewer', 'ADMIN');
    invalid.crews[0].assessor = { ...invalid.crews[0].assessor!, eligible: false };
    const errors = validateOperationalTeam(invalid);
    expect(errors).toContain('Choose an eligible Team Lead.');
    expect(errors).toContain('Crew 1 needs an eligible assessor.');
  });

  it('retains member IDs as contractor IDs and does not treat the review actor as the operational lead', () => {
    const team = completeTeam();
    expect(team.teamLead?.id).toBe('tl');
    expect(team.teamLead?.role).toBe('TEAM_LEAD');
    expect(team.teamLead?.role).not.toBe('ADMIN');
  });
});