'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Award, 
  Banknote,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// Mock data
const mockContractor = {
  id: '1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '(555) 123-4567',
  status: 'Active',
  onboardingStatus: 'APPROVED',
  eligible: true,
  businessName: 'Smith Electrical Services LLC',
  businessType: 'LLC',
  address: '1234 Oak Street, Tampa, FL 33601',
  joinDate: '2023-03-15',
  ytdEarnings: '$45,230',
  totalTickets: 145,
  insurance: {
    generalLiability: { status: 'active', expires: '2026-12-31' },
    workersComp: { status: 'active', expires: '2026-06-30' },
    auto: { status: 'active', expires: '2026-08-15' },
  },
  credentials: [
    { type: 'Master Electrician', number: 'FL-12345', expires: '2025-12-31' },
    { type: 'OSHA 30-Hour', number: 'OSHA-98765', expires: '2025-06-15' },
  ],
};

export default function ContractorDetailPage() {
  const params = useParams();
  const [isApproving, setIsApproving] = useState(false);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${mockContractor.firstName} ${mockContractor.lastName}`}
        description="Contractor details and management"
        showBackButton
        backHref="/admin/contractors"
      >
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />
          Deactivate
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                  {getInitials(mockContractor.firstName, mockContractor.lastName)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">
                {mockContractor.firstName} {mockContractor.lastName}
              </h2>
              <p className="text-slate-500">{mockContractor.businessName}</p>
              <div className="mt-4">
                <StatusBadge status={mockContractor.status} />
              </div>
              <div className="mt-6 space-y-2 w-full text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{mockContractor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{mockContractor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{mockContractor.address}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats & Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">YTD Earnings</p>
                <p className="text-2xl font-bold">{mockContractor.ytdEarnings}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Total Tickets</p>
                <p className="text-2xl font-bold">{mockContractor.totalTickets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Join Date</p>
                <p className="text-lg font-bold">{mockContractor.joinDate}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Eligible</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockContractor.eligible ? 'Yes' : 'No'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="insurance">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insurance">
                <FileText className="w-4 h-4 mr-2" />
                Insurance
              </TabsTrigger>
              <TabsTrigger value="credentials">
                <Award className="w-4 h-4 mr-2" />
                Credentials
              </TabsTrigger>
              <TabsTrigger value="banking">
                <Banknote className="w-4 h-4 mr-2" />
                Banking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insurance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">General Liability</p>
                      <p className="text-sm text-slate-500">$1,000,000 coverage</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status="Active" size="sm" />
                      <p className="text-sm text-slate-500 mt-1">
                        Expires: {mockContractor.insurance.generalLiability.expires}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Workers Compensation</p>
                      <p className="text-sm text-slate-500">Statutory limits</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status="Active" size="sm" />
                      <p className="text-sm text-slate-500 mt-1">
                        Expires: {mockContractor.insurance.workersComp.expires}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Auto Liability</p>
                      <p className="text-sm text-slate-500">$1,000,000 coverage</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status="Active" size="sm" />
                      <p className="text-sm text-slate-500 mt-1">
                        Expires: {mockContractor.insurance.auto.expires}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credentials" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockContractor.credentials.map((cred, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{cred.type}</p>
                        <p className="text-sm text-slate-500">License: {cred.number}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status="Active" size="sm" />
                        <p className="text-sm text-slate-500 mt-1">
                          Expires: {cred.expires}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banking" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Account Holder</p>
                      <p className="font-medium">{mockContractor.businessName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Bank</p>
                      <p className="font-medium">Chase Bank</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account Type</p>
                      <p className="font-medium">Business Checking</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account Number</p>
                      <p className="font-medium">****1234</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
