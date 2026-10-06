"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { TicketStatus } from "@/types"
import type { ContractorTicketStatus } from "@/lib/utils/statusUpdateFlow"
import { useState, useEffect } from "react"

export interface TicketFiltersState {
    search: string
    status: TicketStatus | ContractorTicketStatus | "ALL"
    importance: "ALL" | "IMPORTANT" | "STANDARD"
}

interface TicketFiltersProps {
    onFilterChange: (filters: TicketFiltersState) => void
    userRole: 'admin' | 'contractor'
}

export function TicketFilters({ onFilterChange, userRole }: TicketFiltersProps) {
    const [filters, setFilters] = useState<TicketFiltersState>({
        search: "",
        status: "ALL",
        importance: "ALL",
    })

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            onFilterChange(filters)
        }, 300)

        return () => clearTimeout(timer)
    }, [filters, onFilterChange])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value }))
    }

    const handleStatusChange = (value: string) => {
        setFilters(prev => ({ ...prev, status: value as TicketFiltersState['status'] }))
    }

    const handleImportanceChange = (value: string) => {
        setFilters(prev => ({ ...prev, importance: value as TicketFiltersState["importance"] }))
    }

    const clearFilters = () => {
        setFilters({
            search: "",
            status: "ALL",
            importance: "ALL",
        })
    }

    return (
        <div className="cc-filter-bar flex flex-col gap-3 xl:flex-row">
            <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                    aria-label="Search tickets"
                    placeholder="Search tickets..."
                    className="pl-10"
                    value={filters.search}
                    onChange={handleSearchChange}
                />
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
                <Select value={filters.status} onValueChange={handleStatusChange}>
                    <SelectTrigger aria-label="Filter by status" className="min-w-0 flex-1 xl:w-[155px] xl:flex-none">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{userRole === 'contractor' ? 'All' : 'All statuses'}</SelectItem>
                        {userRole === 'contractor' ? <>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </> : <>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ASSIGNED">Assigned</SelectItem>
                            <SelectItem value="IN_ROUTE">En route</SelectItem>
                            <SelectItem value="ON_SITE">On site</SelectItem>
                            <SelectItem value="PENDING_REVIEW">Review</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="NEEDS_REWORK">Corrections</SelectItem>
                            <SelectItem value="CLOSED">Submitted to utility</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                        </>}
                    </SelectContent>
                </Select>

                <Select value={filters.importance} onValueChange={handleImportanceChange}>
                    <SelectTrigger aria-label="Filter by importance" className="min-w-0 flex-1 xl:w-[145px] xl:flex-none">
                        <SelectValue placeholder="Importance" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Tickets</SelectItem>
                        <SelectItem value="IMPORTANT">Important</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                    </SelectContent>
                </Select>

                {(filters.search || filters.status !== "ALL" || filters.importance !== "ALL") && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} aria-label="Clear filters" title="Clear filters">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
