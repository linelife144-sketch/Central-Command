import {redirect} from 'next/navigation';
export default async function LegacyAssessmentCreate({searchParams}:{searchParams:Promise<{ticketId?:string}>}) {
  const {ticketId}=await searchParams;
  redirect(ticketId?`/tickets/${ticketId}/assessment`:'/tickets');
}
