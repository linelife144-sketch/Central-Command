'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ticketService } from "@/lib/services/ticketService"
import { stormEventService, type StormEventSummary } from '@/lib/services/stormEventService';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from "sonner" // Assuming Sonner is installed as per instructions

const ticketFormSchema = z.object({
    storm_event_id: z.string().min(1, "Storm Event is required"),
    ticket_number: z.string().min(1, "Ticket number is required"),
    utility_client: z.string().min(1, "Utility Client is required"),
    work_order_ref: z.string().optional(),
    work_description: z.string().min(10, "Description must be at least 10 characters"),
    special_instructions: z.string().optional(),
    priority: z.enum(["A", "B", "C", "X"]),
    status: z.enum(["DRAFT", "ASSIGNED", "REJECTED", "IN_ROUTE", "ON_SITE", "IN_PROGRESS", "COMPLETE", "PENDING_REVIEW", "APPROVED", "NEEDS_REWORK", "CLOSED", "ARCHIVED", "EXPIRED"]),
    scheduled_date: z.string().min(1, "Scheduled date is required"),
    due_date: z.string().min(1, "Due date is required"),
    equipment_type: z.string().optional(),
    address: z.string().min(5, "Valid address required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(2, "State is required"),
    zip_code: z.string().min(5, "Zip Code is required"),
    geofence_radius_meters: z.coerce.number().min(0).default(500),
})

type TicketFormValues = z.infer<typeof ticketFormSchema>

export function TicketForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { profile } = useAuth()
    
    const stormEventIdParam = searchParams.get("storm_event_id") || ""
    const [stormEvents, setStormEvents] = useState<StormEventSummary[]>([])
    const [loadingStorms, setLoadingStorms] = useState(true)

    const form = useForm<TicketFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(ticketFormSchema) as any,
        defaultValues: {
            storm_event_id: "",
            ticket_number: "",
            utility_client: "",
            work_order_ref: "",
            work_description: "",
            special_instructions: "",
            priority: "C",
            status: "DRAFT",
            scheduled_date: "",
            due_date: "",
            equipment_type: "",
            address: "",
            city: "",
            state: "",
            zip_code: "",
            geofence_radius_meters: 500,
        },
    })

    // Map database utility client name to Select value options
    const mapUtilityToFormValue = (utility: string): string => {
        const upper = utility.toUpperCase().trim();
        if (upper === 'ENTERGY') return 'Entergy';
        if (upper === 'DUKE' || upper === 'DUKE ENERGY') return 'Duke Energy';
        if (upper === 'FPL' || upper === 'FLORIDA POWER & LIGHT') return 'Florida Power & Light';
        if (upper === 'TECO') return 'TECO';
        return utility; // fallback
    };

    // Load active/planned storm events
    useEffect(() => {
        let active = true;
        async function fetchStorms() {
            try {
                const events = await stormEventService.listStormEvents()
                if (!active) return;
                
                // Show non-closed events
                const activeEvents = events.filter(e => e.status !== 'CLOSED')
                setStormEvents(activeEvents)

                // Select storm event passed by query parameter or localStorage
                const initialStormId = stormEventIdParam || 
                                       window.localStorage.getItem('active_storm_event_id') || 
                                       "";
                
                if (initialStormId) {
                    const matchedEvent = activeEvents.find(e => e.id === initialStormId)
                    if (matchedEvent) {
                        form.setValue('storm_event_id', matchedEvent.id)
                        form.setValue('utility_client', mapUtilityToFormValue(matchedEvent.utilityClient))
                    }
                }
            } catch (err) {
                console.error("Failed to load storm events", err)
                toast.error("Failed to load active storm events")
            } finally {
                if (active) setLoadingStorms(false)
            }
        }
        fetchStorms()
        return () => { active = false; }
    }, [stormEventIdParam, form])

    const handleStormChange = (stormId: string) => {
        form.setValue('storm_event_id', stormId);
        const selected = stormEvents.find(e => e.id === stormId);
        if (selected) {
            form.setValue('utility_client', mapUtilityToFormValue(selected.utilityClient));
        }
    }

    async function onSubmit(data: TicketFormValues) {
        try {
            // Validate dates
            if (new Date(data.due_date) <= new Date(data.scheduled_date)) {
                form.setError("due_date", { message: "Due date must be after scheduled date" });
                return;
            }

            const payload = {
                ...data,
                created_by: profile?.id
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await ticketService.createTicket(payload as any)
            toast.success("Ticket created successfully")
            router.push("/tickets")
            router.refresh()
        } catch (error) {
            toast.error("Failed to create ticket")
            console.error(error)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="storm_event_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Storm Event *</FormLabel>
                                <Select 
                                    onValueChange={handleStormChange} 
                                    value={field.value}
                                    disabled={loadingStorms}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingStorms ? "Loading..." : "Select Storm Event"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {stormEvents.map(event => (
                                            <SelectItem key={event.id} value={event.id}>
                                                {event.name} ({event.eventCode})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="ticket_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ticket Number *</FormLabel>
                                <FormControl>
                                    <Input placeholder="GES-260210-001" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="utility_client"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Utility Client *</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                    disabled={true}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Auto-populated" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Duke Energy">Duke Energy</SelectItem>
                                        <SelectItem value="Florida Power & Light">Florida Power & Light</SelectItem>
                                        <SelectItem value="TECO">TECO</SelectItem>
                                        <SelectItem value="Entergy">Entergy</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="work_order_ref"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Work Order Ref (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ref #" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="work_description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Work Description *</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Describe the damage or work required (min 10 chars)..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="special_instructions"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Special Instructions</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Access codes, gate keys, or safety warnings..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Priority *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="A">A - Critical</SelectItem>
                                        <SelectItem value="B">B - Urgent</SelectItem>
                                        <SelectItem value="C">C - Standard</SelectItem>
                                        <SelectItem value="X">X - Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="equipment_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Initial Equipment Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Transformer">Transformer</SelectItem>
                                        <SelectItem value="Pole">Pole</SelectItem>
                                        <SelectItem value="Conductor/Wire">Conductor/Wire</SelectItem>
                                        <SelectItem value="Switch">Switch</SelectItem>
                                        <SelectItem value="Capacitor">Capacitor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scheduled_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Scheduled Date *</FormLabel>
                                <FormControl>
                                    <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Date *</FormLabel>
                                <FormControl>
                                    <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Location Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="City" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>State *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="FL" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="zip_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zip Code *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="33601" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="geofence_radius_meters"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Geofence Radius (meters)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="500" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit">Create Ticket</Button>
                </div>
            </form>
        </Form>
    )
}
