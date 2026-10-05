import { supabase } from '@/lib/supabase/client';
import { isAuthOrPermissionError } from '@/lib/utils/errorHandling';
import type { ContractorRole } from '@/types';

interface RemoteContractorRow {
  id: string;
  profile_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  business_name: string;
  business_type: string | null;
  city: string | null;
  state: string | null;
  onboarding_completed_at: string | null;
  address_line1: string | null;
  address_line2: string | null;
  zip_code: string | null;
  vehicle_registration_photo_path: string | null;
  business_email: string | null;
  business_phone: string | null;
  role: ContractorRole;
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
  is_email_verified?: boolean;
}

interface RemoteTicketRow {
  id: string;
  ticket_number: string;
  status: string;
  is_important: boolean;
  utility_client: string;
  updated_at: string;
  assigned_to: string | null;
}

export interface ContractorListItem {
  id: string;
  profileId: string | null;
  fullName: string;
  businessName: string;
  businessType: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  onboardingCompletedAt: string | null;
  email: string;
  phone: string | null;
  assignedTicketCount: number;
  alerts: string[];
  emailVerified?: boolean;
  role: ContractorRole;
}

export interface ContractorListFilters {
  search?: string;
  activeOnly?: boolean;
}

export interface AssignableContractor {
  id: string;
  displayName: string;
}

export interface ContractorDetail {
  addressLine1: string | null;
  addressLine2: string | null;
  zipCode: string | null;
  vehicleRegistrationPhotoPath: string | null;
  emailVerified?: boolean;
  id: string;
  profileId: string | null;
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
  onboardingCompletedAt: string | null;
  role: ContractorRole;
  assignedTicketCount: number;
  totalTicketCount: number;
  createdAt: string;
  updatedAt: string;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    isImportant: boolean;
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

function isOpenTicketStatus(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized !== 'CLOSED' && normalized !== 'ARCHIVED' && normalized !== 'EXPIRED';
}

function buildAlerts(contractor: RemoteContractorRow): string[] {
  const alerts: string[] = [];

  if (!contractor.onboarding_completed_at) alerts.push(contractor.profile_id ? 'Onboarding incomplete' : 'Account setup not started');

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
    .select('id, first_name, last_name, email, phone, is_active, is_email_verified')
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
    .select('id, ticket_number, status, is_important, utility_client, updated_at, assigned_to')
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

function buildAssignedTicketCountByContractor(ticketRows: RemoteTicketRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of ticketRows) {
    if (!row.assigned_to || !isOpenTicketStatus(row.status)) {
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

function sortByName(items: ContractorListItem[]): ContractorListItem[] {
  return items.sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export const contractorService = {
  /** Sets profiles.is_active (Inactive = false). Enforced server-side: only SUPER_ADMIN/CEO may change it. */
  async setContractorActive(profileId: string, isActive: boolean): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({ is_active: isActive }).eq('id', profileId);
    if (error) throw new Error(error.message);
  },
  async listContractors(filters: ContractorListFilters = {}): Promise<ContractorListItem[]> {
    if (!(await hasActiveSession())) {
      return [];
    }

    const contractorColumns = [
      'id',
      'profile_id',
      'first_name',
      'last_name',
      'business_name',
      'business_type',
      'city',
      'state',
      'onboarding_completed_at',
      'address_line1',
      'address_line2',
      'zip_code',
      'vehicle_registration_photo_path',
      'business_email',
      'business_phone',
      'role',
      'created_at',
      'updated_at',
    ].join(',');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase.from('contractors') as any).select(
      contractorColumns,
    ).eq('is_deleted', false);


    const { data, error } = await query;


    if (error) {
      if (isAuthOrPermissionError(error)) {
        return [];
      }
      throw error;
    }

    const rows = (data ?? []) as RemoteContractorRow[];
    const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => !!id);
    const contractorIds = rows.map((row) => row.id);

    const [profilesById, ticketRows] = await Promise.all([
      fetchProfilesByIds(profileIds),
      fetchTicketRows(contractorIds),
    ]);

    const assignedTicketCountByContractor = buildAssignedTicketCountByContractor(ticketRows);

    const mappedItems = rows.map((row) => {
      const profile = row.profile_id ? profilesById.get(row.profile_id) : undefined;
      const fullName = profile ? formatFullName(profile) : `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.business_name;
      const email = profile?.email ?? row.business_email ?? '';

      return {
        id: row.id,
        profileId: row.profile_id,
        fullName,
        businessName: row.business_name,
        businessType: row.business_type,
        city: row.city,
        state: row.state,
        emailVerified: profile?.is_email_verified,
        isActive: profile?.is_active ?? !row.profile_id,
        onboardingCompletedAt: row.onboarding_completed_at ?? null,
        email,
        phone: profile?.phone ?? row.business_phone,
        assignedTicketCount: assignedTicketCountByContractor.get(row.id) ?? 0,
        alerts: buildAlerts(row),
        role: row.role,
      } satisfies ContractorListItem;
    });

    return sortByName(applySearchFilter(mappedItems, filters.search).filter(c => !filters.activeOnly || c.isActive));
  },

  async listAssignableContractors(): Promise<AssignableContractor[]> {
    const contractors = await this.listContractors({ activeOnly: true });

    return contractors
      .filter(contractor => contractor.isActive && contractor.profileId)
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
      'first_name',
      'last_name',
      'business_name',
      'business_type',
      'city',
      'state',
      'onboarding_completed_at',
      'address_line1',
      'address_line2',
      'zip_code',
      'vehicle_registration_photo_path',
      'business_email',
      'business_phone',
      'role',
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
      fetchProfilesByIds(row.profile_id ? [row.profile_id] : []),
      fetchTicketRows([row.id]),
    ]);

    const profile = row.profile_id ? profilesById.get(row.profile_id) : undefined;
    const assignedTicketCountByContractor = buildAssignedTicketCountByContractor(ticketRows);
    const totalTicketCountByContractor = buildTotalTicketCountByContractor(ticketRows);

    const recentTickets = ticketRows
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 8)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        isImportant: ticket.is_important,
        utilityClient: ticket.utility_client,
        updatedAt: ticket.updated_at,
      }));

    return {
      id: row.id,
      profileId: row.profile_id,
      fullName: profile ? formatFullName(profile) : `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.business_name,
      businessName: row.business_name,
      businessType: row.business_type,
      email: profile?.email ?? row.business_email ?? '',
      phone: profile?.phone ?? row.business_phone,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      zipCode: row.zip_code,
      vehicleRegistrationPhotoPath: row.vehicle_registration_photo_path,
      businessEmail: row.business_email,
      businessPhone: row.business_phone,
      city: row.city,
      state: row.state,
      emailVerified: profile?.is_email_verified,
      isActive: profile?.is_active ?? !row.profile_id,
      onboardingCompletedAt: row.onboarding_completed_at ?? null,
      role: row.role,
      assignedTicketCount: assignedTicketCountByContractor.get(row.id) ?? 0,
      totalTicketCount: totalTicketCountByContractor.get(row.id) ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recentTickets,
    };
  },
};
