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
  accent: 'cc-metric-accent',
  success: 'cc-metric-success',
  warning: 'cc-metric-warning',
  danger: 'cc-metric-danger',
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
    <Card className={cn('cc-metric', variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="font-sans text-xs font-semibold leading-relaxed text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="cc-metric-icon">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn('cc-metric-value', String(value).length > 8 && 'cc-metric-long-value')}>
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
