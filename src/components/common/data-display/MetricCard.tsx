'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

const variantStyles: Record<NonNullable<MetricCardProps['variant']>, string> = {
  default: '',
  accent: 'bg-grid-blue-soft border-grid-brand',
  success: 'bg-grid-success-soft border-grid-success',
  warning: 'bg-grid-warning-soft border-grid-warning',
  danger: 'bg-grid-danger-soft border-grid-danger',
};

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  variant = 'default',
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up'
    ? 'text-grid-success-ink'
    : trend === 'down'
    ? 'text-grid-danger-ink'
    : 'text-muted-foreground';

  return (
    <Card variant="interactive" className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="w-8 h-8 bg-surface-raised text-grid-brand-ink border border-border rounded-lg flex items-center justify-center shadow-elevation-xs">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {value}
        </div>
        {(description || trend) && (
          <div className="flex items-center gap-1 mt-1">
            {trend && (
              <TrendIcon className={cn('w-3 h-3', trendColor)} />
            )}
            {trendValue && (
              <span className={cn('text-xs font-semibold', trendColor)}>
                {trendValue}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
