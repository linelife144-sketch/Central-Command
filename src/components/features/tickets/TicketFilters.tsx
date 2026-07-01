"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { TicketStatus, PriorityLevel } from "@/types"
import { useState, useEffect } from "react"

export interface TicketFiltersState {
    search: string
    status: TicketStatus | "ALL"
    priority: PriorityLevel | "ALL"
}

interface TicketFiltersProps {
    onFilterChange: (filters: TicketFiltersState) => void
}

export function TicketFilters({ onFilterChange }: TicketFiltersProps) {
    const [filters, setFilters] = useState<TicketFiltersState>({
        search: "",
        status: "ALL",
        priority: "ALL",
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
        setFilters(prev => ({ ...prev, status: value as TicketStatus | "ALL" }))
    }

    const handlePriorityChange = (value: string) => {
        setFilters(prev => ({ ...prev, priority: value as PriorityLevel | "ALL" }))
    }

    const clearFilters = () => {
        setFilters({
            search: "",
            status: "ALL",
            priority: "ALL",
        })
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tickets..."
                    className="pl-8"
                    value={filters.search}
                    onChange={handleSearchChange}
                />
            </div>
            <div className="flex gap-2">
                <Select value={filters.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="IN_ROUTE">In Route</SelectItem>
                        <SelectItem value="ON_SITE">On Site</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETE">Complete</SelectItem>
                        <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="NEEDS_REWORK">Needs Rework</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filters.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Priorities</SelectItem>
                        <SelectItem value="A">Critical (A)</SelectItem>
                        <SelectItem value="B">Urgent (B)</SelectItem>
                        <SelectItem value="C">Standard (C)</SelectItem>
                        <SelectItem value="X">Hold (X)</SelectItem>
                    </SelectContent>
                </Select>

                {(filters.search || filters.status !== "ALL" || filters.priority !== "ALL") && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
