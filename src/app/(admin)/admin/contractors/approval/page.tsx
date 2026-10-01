'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  User,
  Shield,
  Banknote,
  Award,
} from 'lucide-react';

interface PendingContractor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  submittedAt: string;
  businessName: string;
  hasInsurance: boolean;
  hasCredentials: boolean;
  hasBanking: boolean;
  trainingCompleted: boolean;
}

const mockPending: PendingContractor[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@example.com',
    submittedAt: '2026-02-08',
    businessName: 'Williams Electrical LLC',
    hasInsurance: true,
    hasCredentials: true,
    hasBanking: true,
    trainingCompleted: true,
  },
  {
    id: '2',
    firstName: 'Jennifer',
    lastName: 'Lee',
    email: 'jennifer.lee@example.com',
    submittedAt: '2026-02-07',
    businessName: 'Lee Power Solutions',
    hasInsurance: true,
    hasCredentials: false,
    hasBanking: true,
    trainingCompleted: true,
  },
];

export default function ContractorApprovalPage() {
  const [selectedSub, setSelectedSub] = useState<PendingContractor | null>(mockPending[0]);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const handleApprove = async () => {
    setIsApproving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsApproving(false);
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRejecting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractor Approvals"
        description={`${mockPending.length} applications pending review`}
        showBackButton
        backHref="/admin/contractors"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pending Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockPending.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedSub?.id === sub.id
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                    {getInitials(sub.firstName, sub.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {sub.firstName} {sub.lastName}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{sub.businessName}</p>
                </div>
                <Badge variant="outline">{sub.submittedAt}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detail View */}
        {selectedSub && (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                        {getInitials(selectedSub.firstName, selectedSub.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>
                        {selectedSub.firstName} {selectedSub.lastName}
                      </CardTitle>
                      <p className="text-slate-500">{selectedSub.businessName}</p>
                      <p className="text-sm text-slate-400">
                        Submitted: {selectedSub.submittedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReject}
                      disabled={isRejecting}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="insurance">Insurance</TabsTrigger>
                    <TabsTrigger value="credentials">Credentials</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-500">Personal Info</p>
                          <p className="font-medium">Complete</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedSub.hasInsurance ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <Shield className={`w-5 h-5 ${
                          selectedSub.hasInsurance ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-500">Insurance</p>
                          <p className="font-medium">
                            {selectedSub.hasInsurance ? 'Uploaded' : 'Missing'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedSub.hasCredentials ? 'bg-green-50' : 'bg-yellow-50'
                      }`}>
                        <Award className={`w-5 h-5 ${
                          selectedSub.hasCredentials ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-500">Credentials</p>
                          <p className="font-medium">
                            {selectedSub.hasCredentials ? 'Complete' : 'Incomplete'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedSub.hasBanking ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <Banknote className={`w-5 h-5 ${
                          selectedSub.hasBanking ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-500">Banking</p>
                          <p className="font-medium">
                            {selectedSub.hasBanking ? 'Complete' : 'Missing'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="insurance" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">General Liability Certificate</p>
                            <p className="text-sm text-slate-500">Uploaded 2026-02-08</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Workers Compensation</p>
                            <p className="text-sm text-slate-500">Uploaded 2026-02-08</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Auto Insurance</p>
                            <p className="text-sm text-slate-500">Uploaded 2026-02-08</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="credentials" className="mt-4">
                    <div className="space-y-3">
                      {selectedSub.hasCredentials ? (
                        <>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Master Electrician License</p>
                              <p className="text-sm text-slate-500">FL-12345 • Expires: 2025-12-31</p>
                            </div>
                            <StatusBadge status="Verified" size="sm" />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">OSHA 30-Hour</p>
                              <p className="text-sm text-slate-500">OSHA-98765 • Expires: 2025-06-15</p>
                            </div>
                            <StatusBadge status="Verified" size="sm" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          No credentials uploaded
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Independent Contractor Agreement</p>
                            <p className="text-sm text-slate-500">Signed: 2026-02-08</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">W-9 Form</p>
                            <p className="text-sm text-slate-500">Uploaded: 2026-02-08</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
