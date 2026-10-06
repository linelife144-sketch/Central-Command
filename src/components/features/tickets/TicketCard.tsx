import { Ticket } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CalendarDays, MapPin, User } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { TicketImportanceBadge } from "./TicketImportanceBadge";
import { TicketStatusBadge } from "@/components/features/tickets/TicketStatusBadge";
import { cn } from "@/lib/utils";

interface TicketCardProps {
    ticket: Ticket;
    onClick?: (ticket: Ticket) => void;
    className?: string;
    assigneeName?: string;
    audienceRole?: 'CONTRACTOR' | 'STAFF';
}

export function TicketCard({ ticket, onClick, className, assigneeName, audienceRole }: TicketCardProps) {
    return (
        <Card
            className={cn(
                "cc-ticket-card transition-shadow",
                onClick && "cursor-pointer hover:shadow-elevation-md",
                className
            )}
            onClick={() => onClick?.(ticket)}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? `Open ticket ${ticket.ticket_number}` : undefined}
            onKeyDown={event => {
                if (onClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onClick(ticket);
                }
            }}
        >
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="font-semibold text-sm text-muted-foreground">
                            {ticket.ticket_number}
                        </div>
                        <div className="font-bold line-clamp-1">
                            {ticket.utility_client}
                        </div>
                    </div>
                    <TicketImportanceBadge isImportant={ticket.is_important} />
                </div>
            </CardHeader>
            <CardContent className="p-4 py-2 space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-3.5 w-3.5" />
                    <span className="line-clamp-1">{ticket.address}</span>
                </div>
                {ticket.scheduled_date && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarDays className="mr-2 h-3.5 w-3.5" />
                        <span>{formatDate(ticket.scheduled_date)}</span>
                    </div>
                )}
                {ticket.assigned_to && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <User className="mr-2 h-3.5 w-3.5" />
                        <span>{assigneeName || 'Contractor assigned'}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 pt-2 flex justify-between items-center">
                <TicketStatusBadge status={ticket.status} audienceRole={audienceRole} reviewStage={ticket.review_stage} utilitySubmittedAt={ticket.utility_submitted_at} />
            </CardFooter>
        </Card>
    );
}
