import type { ContractorRole } from '@/types';

export type OperationalSlot = 'TEAM_LEAD' | 'LEAD_DRIVER' | 'CREW_DRIVER' | 'CREW_ASSESSOR';

export interface OperationalContractor {
  id: string;
  firstName: string;
  lastName: string;
  role: ContractorRole | string;
  isActive: boolean;
  eligible: boolean;
}

export interface OperationalCrewDraft {
  driver: OperationalContractor | null;
  assessor: OperationalContractor | null;
}

export interface OperationalTeamDraft {
  teamLead: OperationalContractor | null;
  leadDriver: OperationalContractor | null;
  crews: OperationalCrewDraft[];
}

const ALLOWED_ROLES: Record<OperationalSlot, readonly string[]> = {
  TEAM_LEAD: ['TEAM_LEAD'],
  LEAD_DRIVER: ['DRIVER'],
  CREW_DRIVER: ['DRIVER'],
  CREW_ASSESSOR: ['DAMAGE_ASSESSER', 'SR_DAMAGE_ASSESSER'],
};

export function getContractorTeamInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '';
  const last = lastName.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '';
  return `${first}${last}`.toLocaleUpperCase();
}

export function getOperationalMemberCode(input: {
  teamOrdinal: number;
  crewOrdinal?: number;
  slot: OperationalSlot;
  firstName: string;
  lastName: string;
}): string {
  const roleCode = input.slot === 'TEAM_LEAD' ? 'TL'
    : input.slot === 'LEAD_DRIVER' ? 'TLD'
      : input.slot === 'CREW_DRIVER' ? `C${input.crewOrdinal ?? 1}-D`
        : `C${input.crewOrdinal ?? 1}-DA`;
  return `T${input.teamOrdinal}-${roleCode}-${getContractorTeamInitials(input.firstName, input.lastName)}`;
}

function isEligible(member: OperationalContractor | null, slot: OperationalSlot): boolean {
  return Boolean(member && member.isActive && member.eligible && ALLOWED_ROLES[slot].includes(member.role));
}

export function validateOperationalTeam(team: OperationalTeamDraft): string[] {
  const errors: string[] = [];
  if (!isEligible(team.teamLead, 'TEAM_LEAD')) errors.push('Choose an eligible Team Lead.');
  if (!isEligible(team.leadDriver, 'LEAD_DRIVER')) errors.push('Choose an eligible Team Lead driver.');
  if (team.crews.length < 1 || team.crews.length > 10) {
    errors.push('A saved team must have between 1 and 10 complete crews.');
  }
  team.crews.forEach((crew, index) => {
    if (!isEligible(crew.driver, 'CREW_DRIVER')) errors.push(`Crew ${index + 1} needs an eligible driver.`);
    if (!isEligible(crew.assessor, 'CREW_ASSESSOR')) errors.push(`Crew ${index + 1} needs an eligible assessor.`);
    if (crew.driver && crew.assessor && crew.driver.id === crew.assessor.id) {
      errors.push(`Crew ${index + 1} must have two different contractors.`);
    }
  });
  const members = [team.teamLead, team.leadDriver, ...team.crews.flatMap(crew => [crew.driver, crew.assessor])]
    .filter((member): member is OperationalContractor => member !== null);
  if (new Set(members.map(member => member.id)).size !== members.length) {
    errors.push('A contractor can occupy only one active position in a team.');
  }
  return errors;
}