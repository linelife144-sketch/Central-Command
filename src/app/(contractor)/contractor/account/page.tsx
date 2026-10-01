'use client';

import { User, Settings, LogOut } from 'lucide-react';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContractorAccountPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Profile and settings access."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="storm-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-grid-navy">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-semibold text-grid-navy">Name:</span> {profile ? `${profile.first_name} ${profile.last_name}` : 'User'}</p>
            <p><span className="font-semibold text-grid-navy">Role:</span> {profile?.role ?? 'USER'}</p>
            <p><span className="font-semibold text-grid-navy">Email:</span> {profile?.email ?? '-'}</p>
          </CardContent>
        </Card>

        <Card className="storm-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-grid-navy">
              <Settings className="h-4 w-4" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-grid-muted">Settings management is available in the next release.</p>
            <Button variant="storm" onClick={() => {
              void signOut();
            }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
