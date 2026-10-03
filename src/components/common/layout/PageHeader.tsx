'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  children,
  showBackButton = false,
  backHref,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="cc-page-header">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          {(showBackButton || backHref) && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-elevation-xs"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="cc-eyebrow mb-2"><span aria-hidden="true" />Central Command</div>
          <h1 className="cc-page-title">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="cc-page-actions flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
