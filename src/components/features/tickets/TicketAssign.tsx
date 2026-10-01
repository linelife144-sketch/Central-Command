"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
// import { getContractors } from "@/lib/services/contractorService" // This might not exist yet?
// Only TicketService usage was mentioned. I might need to mock or check available services.
// I'll assume for now I can pass a list of contractors or fetch them.
// Let's implement fetching logic if service exists, otherwise use props.
// Checking `lib/services` might be needed. For now I will focus on the UI and prop interface.

interface ContractorOption {
    id: string
    name: string
}

interface TicketAssignProps {
    isOpen: boolean
    onClose: () => void
    onAssign: (contractorId: string) => Promise<void>
    currentAssigneeId?: string
    ticketNumber: string
    // In a real app, passing the list of contractors or a fetcher would be better.
    // I'll simulate fetching for now or assume a callback to get them? 
    // Actually, asking for contractors via props is cleaner for component purity.
    // But for simplicity in this "feature" component, I'll fetch them.
    // Wait, I don't know if `contractorService` exists.
    // I'll just check `lib/services` first.
}

export function TicketAssign({ isOpen, onClose, onAssign, currentAssigneeId, ticketNumber }: TicketAssignProps) {
    const [assigneeId, setAssigneeId] = useState<string>(currentAssigneeId || "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [contractors, setContractors] = useState<ContractorOption[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadContractors()
            if (currentAssigneeId) setAssigneeId(currentAssigneeId)
        }
    }, [isOpen, currentAssigneeId])

    async function loadContractors() {
        setIsLoading(true)
        try {
            // TODO: Replace with actual service call
            // const subs = await contractorService.getContractors()
            // Mock data for now until I verify service exists
            await new Promise(resolve => setTimeout(resolve, 500))
            setContractors([
                { id: "sub1", name: "John Doe (Electrician)" },
                { id: "sub2", name: "Jane Smith (HVAC)" },
                { id: "sub3", name: "Bob Wilson (General)" },
            ])
        } catch (error) {
            console.error("Failed to load contractors", error)
            toast.error("Failed to load contractors")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!assigneeId) return

        setIsSubmitting(true)
        try {
            await onAssign(assigneeId)
            onClose()
        } catch (error) {
            // Error handling should be done by parent or here.
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Ticket {ticketNumber}</DialogTitle>
                    <DialogDescription>
                        Select a contractor to assign this ticket to.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contractor" className="text-right">
                            Assign To
                        </Label>
                        <Select
                            value={assigneeId}
                            onValueChange={setAssigneeId}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={isLoading ? "Loading..." : "Select contractor"} />
                            </SelectTrigger>
                            <SelectContent>
                                {contractors.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.id}>
                                        {sub.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!assigneeId || isSubmitting}>
                        {isSubmitting ? "Assigning..." : "Assign Ticket"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
