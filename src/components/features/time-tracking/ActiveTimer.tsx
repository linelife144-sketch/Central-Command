'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { APP_CONFIG } from '@/lib/config/appConfig';
import { formatDuration } from '@/lib/utils/formatters';
import { calculateElapsedMinutes, calculateElapsedSeconds, formatTimerClock, getDurationState } from '@/lib/utils/timeTracking';

interface ActiveTimerProps {
  clockInAt: string;
}

export function ActiveTimer({ clockInAt }: ActiveTimerProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const elapsedMinutes = useMemo(() => calculateElapsedMinutes(clockInAt, now), [clockInAt, now]);
  const elapsedSeconds = useMemo(() => calculateElapsedSeconds(clockInAt, now), [clockInAt, now]);
  const durationState = useMemo(
    () =>
      getDurationState(
        elapsedMinutes,
        APP_CONFIG.WARNING_TIME_ENTRY_HOURS,
        APP_CONFIG.MAX_TIME_ENTRY_HOURS,
      ),
    [elapsedMinutes],
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-grid-navy">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm font-semibold">Active Timer</span>
          </div>
          <Badge variant={durationState.isExceeded ? 'destructive' : durationState.isWarning ? 'secondary' : 'default'}>
            {durationState.isExceeded ? 'Exceeded' : durationState.isWarning ? 'Warning' : 'Normal'}
          </Badge>
        </div>

        <div className="text-3xl font-semibold tracking-tight text-grid-navy">
          {formatTimerClock(elapsedSeconds)}
        </div>

        <p className="text-xs text-slate-600">
          Elapsed: {formatDuration(elapsedMinutes)} | Warning at {APP_CONFIG.WARNING_TIME_ENTRY_HOURS}h | Max {APP_CONFIG.MAX_TIME_ENTRY_HOURS}h
        </p>

        {durationState.isWarning && !durationState.isExceeded && (
          <p className="flex items-center gap-2 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Approaching max shift duration.
          </p>
        )}

        {durationState.isExceeded && (
          <p className="flex items-center gap-2 text-xs font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Max duration exceeded. Clock out now and notify admin.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
