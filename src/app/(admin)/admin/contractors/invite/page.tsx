import Link from 'next/link';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileDown, Terminal } from 'lucide-react';

export default function ContractorInvitePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite Contractor"
        description="Provision contractor accounts using the approved CSV onboarding workflow."
        showBackButton
        backHref="/admin/contractors"
      />

      <Card className="storm-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-grid-blue" />
            Step 1: Prepare CSV
          </CardTitle>
          <CardDescription>
            Download the template and fill in one row per contractor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild variant="outline">
            <Link href="/templates/contractor-invite-template.csv" download>
              Download CSV Template
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Required headers: <code>first_name,last_name,email,role,temp_password</code>
          </p>
        </CardContent>
      </Card>

      <Card className="storm-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-grid-blue" />
            Step 2: Run Provisioning
          </CardTitle>
          <CardDescription>
            Validate first with dry-run, then apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-grid-surface bg-grid-surface p-3 font-mono text-sm">
            npm run provision:users -- --file ./contractor-invites.csv --dry-run
          </div>
          <div className="rounded-md border border-grid-surface bg-grid-surface p-3 font-mono text-sm">
            npm run provision:users -- --file ./contractor-invites.csv --apply
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/contractors">
            Back To Contractors
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
