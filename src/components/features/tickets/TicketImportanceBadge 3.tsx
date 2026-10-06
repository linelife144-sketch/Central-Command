import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TicketImportanceBadgeProps {
    isImportant: boolean;
}

// A ticket is either Standard or Important. Important means there is an
// environmental hazard (e.g., an oil leak) or the public is in danger.
export function TicketImportanceBadge({ isImportant }: TicketImportanceBadgeProps) {
    if (isImportant) {
        return (
            <Badge variant="destructive">
                <AlertTriangle aria-hidden />
                Important
            </Badge>
        );
    }

    return (
        <Badge variant="secondary">
            <span className="size-1.5 rounded-full bg-current opacity-50" aria-hidden />
            Standard
        </Badge>
    );
}
