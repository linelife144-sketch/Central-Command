
import { Badge } from '@/components/ui/badge';

interface TicketPriorityBadgeProps {
    priority: string;
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';

    switch (priority) {
        case 'A': // Critical
            variant = 'destructive';
            break;
        case 'B': // Urgent
            variant = 'default'; // primary color
            break;
        case 'C': // Standard
            variant = 'secondary';
            break;
        case 'X': // Hold
            variant = 'outline';
            break;
    }

    return (
        <Badge variant={variant}>
            {priority}
        </Badge>
    );
}
