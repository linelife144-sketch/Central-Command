import { StormTicketStart } from '@/components/features/storms/StormTicketStart';
import { Suspense } from 'react';
export default function CreateTicketPage() {
  return <Suspense fallback={<p>Loading storm events...</p>}><StormTicketStart /></Suspense>;
}
