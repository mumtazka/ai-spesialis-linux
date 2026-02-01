import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[60px] w-full rounded-sm border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100',
          'placeholder:text-slate-500',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/50 focus-visible:border-terminal-green/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none font-mono',
          'transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
