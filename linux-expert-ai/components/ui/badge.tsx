import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        arch: 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green hover:bg-terminal-green/20',
        ubuntu: 'border-terminal-orange/50 bg-terminal-orange/10 text-terminal-orange hover:bg-terminal-orange/20',
        danger: 'border-terminal-red/50 bg-terminal-red/10 text-terminal-red hover:bg-terminal-red/20',
        warning: 'border-terminal-yellow/50 bg-terminal-yellow/10 text-terminal-yellow hover:bg-terminal-yellow/20',
        info: 'border-terminal-cyan/50 bg-terminal-cyan/10 text-terminal-cyan hover:bg-terminal-cyan/20',
        neutral: 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
