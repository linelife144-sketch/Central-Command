import { supabase } from '@/lib/supabase/client';
import { isAuthOrPermissionError } from '@/lib/utils/errorHandling';

interface RemoteContractorRow {
  id: string;
  profile_id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  state: string | null;
  onboarding_status: string;
  is_eligible_for_assignment: boolean;
  eligibility_reason: string | null;
  business_email: string | null;
  business_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
}

interface RemoteTicketRow {
  id: string;
  ticket_number: string;
  status: string;
  priority: string;
  utility_client: string;
  updated_at: string;
  assigned_to: string | null;
}

export interface ContractorListItem {
  id: string;
  profileId: string;
  fullName: string;
  businessName: string;
  businessType: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  onboardingStatus: string;
  eligibleForAssignment: boolean;
  eligibilityReason: string | null;
  email: string;
  phone: string | null;
  activeTicketCount: number;
  alerts: string[];
}

export interface ContractorListFilters {
  search?: string;
  onboardingStatus?: string;
  eligibleOnly?: boolean;
}

export interface AssignableContractor {
  id: string;
  displayName: string;
}

export interface ContractorDetail {
  id: string;
  profileId: string;
  fullName: string;
  businessName: string;
  businessType: string | null;
  email: string;
  phone: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  onboardingStatus: string;
  eligibleForAssignment: boolean;
  eligibilityReason: string | null;
  activeTicketCount: number;
  totalTicketCount: number;
  createdAt: string;
  updatedAt: string;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    priority: string;
    utilityClient: string;
    updatedAt: string;
  }>;
}

function formatFullName(profile?: RemoteProfileRow): string {
  if (!profile) {
    return 'Unknown';
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  return fullName.length > 0 ? fullName : profile.email;
}

function isActiveTicketStatus(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized !== 'CLOSED' && normalized !== 'ARCHIVED' && normalized !== 'EXPIRED';
}

function buildAlerts(contractor: RemoteContractorRow): string[] {
  const alerts: string[] = [];

  if (contractor.onboarding_status.toUpperCase() !== 'APPROVED') {
    alerts.push('Onboarding pending');
  }

  if (!contractor.is_eligible_for_assignment) {
    alerts.push(contractor.eligibility_reason ?? 'Not eligible for assignment');
  }

  return alerts;
}

async function hasActiveSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return false;
  }

  return true;
}

async function fetchProfilesByIds(profileIds: string[]): Promise<Map<string, RemoteProfileRow>> {
  if (profileIds.length === 0) {
    return new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .select('id, first_name, last_name, email, phone, is_active')
    .in('id', profileIds);

  if (error) {
    if (isAuthOrPermissionError(error)) {
      return new Map();
    }
    throw error;
  }

  const rows = (data ?? []) as RemoteProfileRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

async function fetchTicketRows(contractorIds: string[]): Promise<RemoteTicketRow[]> {
  if (contractorIds.length === 0) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tickets') as any)
    .select('id, ticket_number, status, priority, utility_client, updated_at, assigned_to')
    .in('assigned_to', contractorIds)
    .eq('is_deleted', false);

  if (error) {
    if (isAuthOrPermissionError(error)) {
      return [];
    }
    throw error;
  }

  return (data ?? []) as RemoteTicketRow[];
}

function buildActiveTicketCountByContractor(ticketRows: RemoteTicketRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of ticketRows) {
    if (!row.assigned_to || !isActiveTicketStatus(row.status)) {
      continue;
    }

    counts.set(row.assigned_to, (counts.get(row.assigned_to) ?? 0) + 1);
  }

  return counts;
}

function buildTotalTicketCountByContractor(ticketRows: RemoteTicketRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of ticketRows) {
    if (!row.assigned_to) {
      continue;
    }

    counts.set(row.assigned_to, (counts.get(row.assigned_to) ?? 0) + 1);
  }

  return counts;
}

function applySearchFilter(items: ContractorListItem[], search?: string): ContractorListItem[] {
  const normalizedSearch = search?.trim().toLowerCase();
  if (!normalizedSearch) {
    return items;
  }

  return items.filter((item) => {
    const searchable = [
      item.fullName,
      item.businessName,
      item.email,
      item.city ?? '',
      item.state ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });
}

function applyStatusFilter(items: ContractorListItem[], onboardingStatus?: string): ContractorListItem[] {
  if (!onboardingStatus || onboardingStatus === 'ALL') {
    return items;
  }

  const normalizedStatus = onboardingStatus.toUpperCase();
  return items.filter((item) => item.onboardingStatus.toUpperCase() === normalizedStatus);
}

function sortByName(items: ContractorListItem[]): ContractorListItem[] {
  return items.sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export const contractorService = {
  async listContractors(filters: ContractorListFilters = {}): Promise<ContractorListItem[]> {
    if (!(await hasActiveSession())) {
      return [];
    }

    const contractorColumns = [
      'id',
      'profile_id',
      'business_name',
      'business_type',
      'city',
      'state',
      'onboarding_status',
      'is_eligible_for_assignment',
      'eligibility_reason',
      'business_email',
      'business_phone',
      'created_at',
      'updated_at',
    ].join(',');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('contractors') as any).select(
      contractorColumns,
    ).eq('is_deleted', false);

    if (filters.eligibleOnly) {
      query = query.eq('is_eligible_for_assignment', true);
    }

    const { data, error } = await query;


    if (error) {
      if (isAuthOrPermissionError(error)) {
        return [];
      }
      throw error;
    }

    const rows = (data ?? []) as RemoteContractorRow[];
    const profileIds = rows.map((row) => row.profile_id);
    const contractorIds = rows.map((row) => row.id);

    const [profilesById, ticketRows] = await Promise.all([
      fetchProfilesByIds(profileIds),
      fetchTicketRows(contractorIds),
    ]);

    const activeTicketCountByContractor = buildActiveTicketCountByContractor(ticketRows);

    const mappedItems = rows.map((row) => {
      const profile = profilesById.get(row.profile_id);
      const fullName = formatFullName(profile);
      const email = profile?.email ?? row.business_email ?? '';

      return {
        id: row.id,
        profileId: row.profile_id,
        fullName,
        businessName: row.business_name,
        businessType: row.business_type,
        city: row.city,
        state: row.state,
        isActive: profile?.is_active ?? false,
      onboardingStatus: row.onboarding_status,
        eligibleForAssignment: row.is_eligible_for_assignment,
        eligibilityReason: row.eligibility_reason,
        email,
        phone: profile?.phone ?? row.business_phone,
        activeTicketCount: activeTicketCountByContractor.get(row.id) ?? 0,
        alerts: buildAlerts(row),
      } satisfies ContractorListItem;
    });

    return sortByName(
      applyStatusFilter(
        applySearchFilter(mappedItems, filters.search),
        filters.onboardingStatus,
      ),
    );
  },

  async listAssignableContractors(): Promise<AssignableContractor[]> {
    const contractors = await this.listContractors({
      onboardingStatus: 'APPROVED',
      eligibleOnly: true,
    });

    return contractors
      .filter(contractor => contractor.isActive)
      .map((contractor) => ({
        id: contractor.id,
        displayName: `${contractor.fullName} (${contractor.businessName})`,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  },

  async getContractorById(contractorId: string): Promise<ContractorDetail | null> {
    if (!contractorId) {
      return null;
    }

    if (!(await hasActiveSession())) {
      return null;
    }

    const contractorColumns = [
      'id',
      'profile_id',
      'business_name',
      'business_type',
      'city',
      'state',
      'onboarding_status',
      'is_eligible_for_assignment',
      'eligibility_reason',
      'business_email',
      'business_phone',
      'created_at',
      'updated_at',
    ].join(',');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.from('contractors') as any)
      .select(contractorColumns)
      .eq('id', contractorId)
      .eq('is_deleted', false)
      .maybeSingle();


    const { data: contractorData, error: contractorError } = result;

    if (contractorError) {
      if (isAuthOrPermissionError(contractorError)) {
        return null;
      }
      throw contractorError;
    }

    if (!contractorData) {
      return null;
    }

    const row = contractorData as RemoteContractorRow;
    const [profilesById, ticketRows] = await Promise.all([
      fetchProfilesByIds([row.profile_id]),
      fetchTicketRows([row.id]),
    ]);

    const profile = profilesById.get(row.profile_id);
    const activeTicketCountByContractor = buildActiveTicketCountByContractor(ticketRows);
    const totalTicketCountByContractor = buildTotalTicketCountByContractor(ticketRows);

    const recentTickets = ticketRows
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 8)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        priority: ticket.priority,
        utilityClient: ticket.utility_client,
        updatedAt: ticket.updated_at,
      }));

    return {
      id: row.id,
      profileId: row.profile_id,
      fullName: formatFullName(profile),
      businessName: row.business_name,
      businessType: row.business_type,
      email: profile?.email ?? row.business_email ?? '',
      phone: profile?.phone ?? row.business_phone,
      businessEmail: row.business_email,
      businessPhone: row.business_phone,
      city: row.city,
      state: row.state,
      isActive: profile?.is_active ?? false,
      onboardingStatus: row.onboarding_status,
      eligibleForAssignment: row.is_eligible_for_assignment,
      eligibilityReason: row.eligibility_reason,
      activeTicketCount: activeTicketCountByContractor.get(row.id) ?? 0,
      totalTicketCount: totalTicketCountByContractor.get(row.id) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recentTickets,
    };
  },
};
