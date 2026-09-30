'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandMarkVariant = 'compact' | 'full';

interface BrandMarkProps {
  className?: string;
  variant?: BrandMarkVariant;
  portalLabel?: 'Admin Portal' | 'Contractor Portal' | 'Secure Access';
  tone?: 'light' | 'dark';
}

export function BrandMark({
  className,
  variant = 'full',
  portalLabel,
  tone = 'dark',
}: BrandMarkProps) {
  const icon = (
    <div className="storm-lightning-ring flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-storm">
      <Image
        alt="Grid Electric storm mark"
        className="h-7 w-7 object-contain"
        height={28}
        priority
        src="/icons/grid-ge-storm-icon-clean.svg"
        width={28}
      />
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        {icon}
        <span className="sr-only">Grid Electric Corp</span>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      {icon}
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold', tone === 'light' ? 'text-white' : 'text-grid-navy')}>
          Grid Electric Corp
        </p>
        {portalLabel ? (
          <p className={cn('truncate text-xs', tone === 'light' ? 'text-grid-blue-light' : 'text-grid-muted')}>{portalLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
