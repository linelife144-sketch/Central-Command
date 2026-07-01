'use client';

import { useEffect, useState } from 'react';
import { ticketService } from '@/lib/services/ticketService';
import { StatusBadge } from '@/components/common/data-display/StatusBadge';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';

interface StatusHistoryTimelineProps {
  ticketId: string;
  refreshKey?: number;
}

export function StatusHistoryTimeline({ ticketId, refreshKey }: StatusHistoryTimelineProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await ticketService.getStatusHistory(ticketId);
        setHistory(data);
      } catch (error) {
        console.error('Failed to load status history:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [ticketId, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic">
        No status history available.
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-semibold">Status Timeline</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {history.map((item, index) => (
            <div key={item.id} className="relative flex items-start group">
              {/* Dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-primary z-10 shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              
              <div className="ml-4 flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.to_status} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                      by {item.profiles?.first_name} {item.profiles?.last_name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col sm:items-end">
                    <span>{format(new Date(item.changed_at), 'MMM d, yyyy h:mm a')}</span>
                    <span className="italic">{formatDistanceToNow(new Date(item.changed_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {item.change_reason && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex gap-2 items-start">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {item.change_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
