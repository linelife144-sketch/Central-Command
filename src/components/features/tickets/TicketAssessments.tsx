'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { formatDate } from '@/lib/utils/formatters';
import type { Ticket } from '@/types';

export function TicketAssessments({ticket,canCreate}:{ticket:Ticket;canCreate:boolean}) {
 const [rows,setRows]=useState<Array<{id:string;reviewed_at:string | null;created_at:string | null}>>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 useEffect(()=>{
  let active=true;setLoading(true);setError(false);setRows([]);
  void (async()=>{
   try {
    const result=await supabase.from('damage_assessments').select('id, reviewed_at, created_at').eq('ticket_id',ticket.id).order('created_at',{ascending:false});
    if(result.error) throw result.error;
    if(active) setRows(result.data ?? []);
   } catch {if(active) setError(true);} finally {if(active) setLoading(false);}
  })();
  return ()=>{active=false;};
 },[ticket.id]);
 return <div className="space-y-3 p-4">
  {loading ? <p>Loading assessments...</p> : error ? <p role="alert">Assessment records are unavailable. The app could not verify whether an assessment has been submitted.</p> : rows.length ? <ul className="space-y-2">{rows.map(row=><li key={row.id} className="flex items-center gap-3"><StatusBadge status={row.reviewed_at ? 'REVIEWED' : 'PENDING_REVIEW'} /><span>{row.created_at ? formatDate(row.created_at) : 'Date unavailable'}</span></li>)}</ul> : <p>No assessment submitted yet.</p>}
  {canCreate && ['ON_SITE','IN_PROGRESS','NEEDS_REWORK'].includes(ticket.status) && <Link className="inline-block font-semibold text-primary" href={`/contractor/assessments/create?ticketId=${ticket.id}`}>Start Assessment Form</Link>}
 </div>;
}
