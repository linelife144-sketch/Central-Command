import { cn } from '@/lib/utils';

/** Abstract network field: a visual echo of connected utility infrastructure. */
export function SignalField({ className }: { className?: string }) {
  return <svg className={cn('cc-signal-field', className)} viewBox="0 0 640 640" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" opacity="0.18">
      {[100, 160, 220, 280, 340].map(radius => <circle key={radius} cx="380" cy="280" r={radius} />)}
      <path d="M0 280H640M380 0V640M100 0L640 540M0 540L540 0" strokeDasharray="3 9" />
      <path d="M40 510L170 420L260 450L380 280L525 180L630 210" strokeWidth="1.5" />
      <path d="M100 80L190 190L380 280L440 430L590 500" />
    </g>
    <g stroke="var(--grid-lightning)" strokeWidth="2">
      <path d="M170 420L380 280L525 180" opacity="0.6" strokeDasharray="5 8" />
      {[ [170,420], [380,280], [525,180] ].map(([x,y]) => <g key={x}><circle cx={x} cy={y} r="7" fill="var(--grid-navy)" /><circle cx={x} cy={y} r="2" fill="var(--grid-lightning)" stroke="none" /><circle cx={x} cy={y} r="15" strokeWidth="1" opacity="0.3" /></g>)}
    </g>
  </svg>;
}
