'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bell} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {useAuth} from '@/components/providers/AuthProvider';
import {supabase} from '@/lib/supabase/client';
import {ticketWorkflowRpc} from '@/lib/services/ticketAssessmentWorkflow';
type Notice={id:string;title:string;body:string;data:{ticketId?:string};read_at:string|null};
export function TicketNotifications(){
  const {profile}=useAuth();const router=useRouter();const [rows,setRows]=useState<Notice[]>([]);const [error,setError]=useState('');
  const load=useCallback(async()=>{if(!profile||!navigator.onLine)return;const {data,error}=await supabase.from('notification_logs').select('id,title,body,data,read_at').eq('user_id',profile.id).eq('channel','IN_APP').order('created_at',{ascending:false}).limit(20);if(error){setError('Notifications are temporarily unavailable.');return;}setRows((data??[]) as unknown as Notice[]);setError('');},[profile]);
  useEffect(()=>{void Promise.resolve().then(load);const timer=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(timer);},[load]);
  const unread=rows.filter(r=>!r.read_at).length;
  return <DropdownMenu onOpenChange={open=>{if(open)void load();}}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Ticket notifications${unread?`, ${unread} unread`:''}`}><Bell className="size-5"/>{unread>0&&<span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-grid-lightning text-[9px] font-bold text-grid-navy">{unread}</span>}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-[70vh] w-[min(360px,calc(100vw-24px))] overflow-y-auto"><DropdownMenuLabel>Ticket notifications</DropdownMenuLabel><DropdownMenuSeparator/>{error?<p role="status" className="p-3 text-sm">{error}</p>:!rows.length?<p className="p-3 text-sm text-muted-foreground">No ticket notifications yet.</p>:rows.map(r=><DropdownMenuItem key={r.id} className="block cursor-pointer p-3" onSelect={()=>{if(!r.read_at)void ticketWorkflowRpc('mark_ticket_notification_read',{p_notification_id:r.id}).then(load).catch(()=>setError('Unable to mark the notification as read.'));if(r.data?.ticketId)router.push(`/tickets/${r.data.ticketId}#assessment`);}}><p className={`text-sm ${!r.read_at?'font-bold':'font-medium'}`}>{r.title}</p><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{r.body}</p></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
