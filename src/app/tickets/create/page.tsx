
'use client';

import { Suspense } from 'react';
import { TicketForm } from '@/components/features/tickets/TicketForm';
import { PageHeader } from '@/components/common/layout/PageHeader';

export default function CreateTicketPage() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <PageHeader
                title="Create New Ticket"
                description="Fill out the form below to create a new service ticket."
                backHref="/tickets"
            />
            <div className="bg-card rounded-lg border p-6">
                <Suspense fallback={<div className="text-center py-6 text-muted-foreground text-sm">Loading ticket form...</div>}>
                    <TicketForm />
                </Suspense>
            </div>
        </div>
    );
}
