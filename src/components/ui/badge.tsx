import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,transform,background-color,border-color] duration-200 ease-standard overflow-hidden active:scale-95",
  {
    variants: {
      variant: {
        default:
          "border-grid-blue/40 bg-grid-blue text-white shadow-elevation-xs [a&]:hover:bg-grid-blue/90 [a&]:hover:shadow-brand",
        secondary:
          "border-border-strong bg-secondary text-secondary-foreground shadow-elevation-xs [a&]:hover:bg-secondary/90 [a&]:hover:shadow-elevation-sm",
        destructive:
          "border-destructive/40 bg-destructive text-white shadow-elevation-xs [a&]:hover:bg-destructive/90 [a&]:hover:shadow-elevation-sm focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border-strong text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:hover:border-accent-hairline [a&]:hover:shadow-elevation-xs",
        ghost: "border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",
        success:
          "border-grid-success bg-grid-success-soft text-grid-success-ink shadow-elevation-xs",
        warning:
          "border-grid-warning bg-grid-warning-soft text-grid-warning-ink shadow-elevation-xs",
        danger:
          "border-grid-danger bg-grid-danger-soft text-grid-danger-ink shadow-elevation-xs",
        info: "border-grid-info bg-grid-info-soft text-grid-info-ink shadow-elevation-xs",
        brand:
          "border-grid-brand bg-grid-brand-soft text-grid-brand-ink shadow-elevation-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
