import { supabase } from '@/lib/supabase/client';
import { readAllRows, readRowsByIds, type PagedRead } from '@/lib/supabase/readRows';
import { isAuthOrPermissionError } from '@/lib/utils/errorHandling';
import type { PermissionMap } from '@/lib/auth/permissionCatalog';
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
  assigned_driver_id: string | null;
  review_stage: string | null;
  utility_submitted_at: string | null;
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
  assignedTicketCount: number | null;
  alerts: string[];
  emailVerified?: boolean;
  role: ContractorRole;
}

export interface ContractorListFilters {
  stormEventId?: string;
  search?: string;
  activeOnly?: boolean;
}

export interface AssignableContractor {
  id: string;
  displayName: string;
  role: ContractorRole;
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
  assignedTicketCount: number | null;
  totalTicketCount: number | null;
  createdAt: string;
  updatedAt: string;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    reviewStage: string | null;
    utilitySubmittedAt: string | null;
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
  if (error) throw error;
  if (!data.session) return false;

  return true;
}

async function fetchProfilesByIds(profileIds: string[]): Promise<Map<string, RemoteProfileRow>> {
  if (profileIds.length === 0) {
    return new Map();
  }

  const rows = await readRowsByIds<RemoteProfileRow>(profileIds, batch => supabase.from('profiles')
    .select('id, first_name, last_name, email, phone, is_active, is_email_verified')
    .in('id', batch) as unknown as PagedRead<RemoteProfileRow>);
  const byId = new Map(rows.map(row => [row.id, row]));
  if (profileIds.some(id => !byId.has(id))) throw new Error('Linked contractor profile data is unavailable. Retry to load contractors.');
  return byId;
}

async function fetchTicketRows(contractorIds: string[], stormEventId?: string): Promise<RemoteTicketRow[]> {
  if (!contractorIds.length) return [];
  const columns = 'id, ticket_number, status, is_important, utility_client, updated_at, assigned_to, assigned_driver_id, review_stage, utility_submitted_at';
  const memberRows = await Promise.all((['assigned_to', 'assigned_driver_id'] as const).map(column =>
    readRowsByIds<RemoteTicketRow>(contractorIds, batch => {
      let query = supabase.from('tickets').select(columns).in(column, batch).eq('is_deleted', false);
      if (stormEventId) query = query.eq('storm_event_id', stormEventId);
      return query as unknown as PagedRead<RemoteTicketRow>;
    })));
  return [...new Map(memberRows.flat().map(row => [row.id, row])).values()];
}

async function readCurrentPermissions(): Promise<PermissionMap> {
  const { data, error } = await supabase.rpc('get_my_permissions');
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Contractor permissions are unavailable.');
  return data as PermissionMap;
}

async function fetchCurrentRosterIds(stormEventId: string, permissions: PermissionMap): Promise<string[]> {
  if (permissions['admin.assignments.view'] !== true) {
    throw new Error('Roster view permission is required to load storm contractors.');
  }
  // The existing compensation RPC joins login profiles, excluding planned
  // unlinked members. Read the same latest revision directly under existing RLS.
  const revisions = await readAllRows(() => supabase.from('storm_event_roster_revisions')
    .select('id, revision_number').eq('storm_event_id', stormEventId));
  const current = revisions.reduce<typeof revisions[number] | undefined>((latest, row) =>
    !latest || row.revision_number > latest.revision_number ? row : latest, undefined);
  if (!current) return [];
  const members = await readAllRows(() => supabase.from('storm_event_roster_members')
    .select('id, contractor_id').eq('roster_revision_id', current.id).neq('member_status', 'REMOVED'));
  return [...new Set(members.map(row => row.contractor_id).filter((id): id is string => !!id))];
}

function buildAssignedTicketCountByContractor(ticketRows: RemoteTicketRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of ticketRows) {
    if (!isOpenTicketStatus(row.status)) {
      continue;
    }

    for (const id of new Set([row.assigned_to, row.assigned_driver_id])) {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return counts;
}

function buildTotalTicketCountByContractor(ticketRows: RemoteTicketRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of ticketRows) {
    for (const id of new Set([row.assigned_to, row.assigned_driver_id])) {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
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
    if (!(await hasActiveSession())) throw new Error('Sign in to load contractors.');

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

    const permissions = await readCurrentPermissions();
    if (permissions['admin.contractors.view'] !== true && permissions['admin.payroll.view'] !== true) {
      throw new Error('Contractor view permission is required to load the directory.');
    }
    const canReadTickets = permissions['admin.tickets.view'] === true;
    const memberIds = filters.stormEventId ? await fetchCurrentRosterIds(filters.stormEventId, permissions) : undefined;
    const createQuery = () => supabase.from('contractors').select(contractorColumns).eq('is_deleted', false);
    const rows = memberIds
      ? await readRowsByIds<RemoteContractorRow>(memberIds, batch => createQuery().in('id', batch) as unknown as PagedRead<RemoteContractorRow>)
      : await readAllRows<RemoteContractorRow>(() => createQuery() as unknown as PagedRead<RemoteContractorRow>);
    const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => !!id);
    const contractorIds = rows.map((row) => row.id);

    const [profilesById, ticketRows] = await Promise.all([
      fetchProfilesByIds(profileIds),
      canReadTickets ? fetchTicketRows(contractorIds, filters.stormEventId) : Promise.resolve(null),
    ]);

    const assignedTicketCountByContractor = buildAssignedTicketCountByContractor(ticketRows ?? []);

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
        assignedTicketCount: canReadTickets ? assignedTicketCountByContractor.get(row.id) ?? 0 : null,
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
        role: contractor.role,
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
    const canReadTickets = (await readCurrentPermissions())['admin.tickets.view'] === true;
    const [profilesById, ticketRows] = await Promise.all([
      fetchProfilesByIds(row.profile_id ? [row.profile_id] : []),
      canReadTickets ? fetchTicketRows([row.id]) : Promise.resolve(null),
    ]);

    const profile = row.profile_id ? profilesById.get(row.profile_id) : undefined;
    const assignedTicketCountByContractor = buildAssignedTicketCountByContractor(ticketRows ?? []);
    const totalTicketCountByContractor = buildTotalTicketCountByContractor(ticketRows ?? []);

    const recentTickets = (ticketRows ?? [])
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 8)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        reviewStage: ticket.review_stage,
        utilitySubmittedAt: ticket.utility_submitted_at,
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
      assignedTicketCount: canReadTickets ? assignedTicketCountByContractor.get(row.id) ?? 0 : null,
      totalTicketCount: canReadTickets ? totalTicketCountByContractor.get(row.id) ?? 0 : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recentTickets,
    };
  },
};
