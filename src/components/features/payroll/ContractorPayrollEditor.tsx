'use client';
import { PayAgreementEditor } from './PayAgreementEditor';
import type { ContractorRole } from '@/types';
export interface ContractorPayrollEditorProps { canEdit?: boolean; canChangeRole?: boolean; contractorId: string; currentRole: ContractorRole; onRoleChanged?: (role: ContractorRole) => void }
export function ContractorPayrollEditor({ contractorId, canEdit = false }: ContractorPayrollEditorProps) {
  return <PayAgreementEditor contractorId={contractorId} canEdit={canEdit} />;
}
