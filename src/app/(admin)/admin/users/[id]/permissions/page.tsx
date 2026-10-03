import { UserPermissionEditor } from '@/components/features/admin/UserPermissions';
export default async function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  return <UserPermissionEditor userId={(await params).id} />;
}
