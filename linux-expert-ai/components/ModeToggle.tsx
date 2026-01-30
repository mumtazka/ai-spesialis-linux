'use client'

import { useModeStore } from '@/store/modeStore'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Arch Linux Logo SVG (simplified triangle)
function ArchLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5z" />
      <path d="M12 8l-3 8h6l-3-8z" />
    </svg>
  )
}

// Ubuntu Logo SVG (circle of friends)
function UbuntuLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="6.5" cy="14" r="2" />
      <circle cx="17.5" cy="14" r="2" />
      <path
        d="M12 7v3M8.5 13l2.5-1.5M15 11.5l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  )
}

export function ModeToggle() {
  const { mode, setMode } = useModeStore()
  const isArch = mode === 'arch'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {/* Arch Button */}
            <button
              onClick={() => setMode('arch')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-all duration-200',
                isArch
                  ? 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green shadow-glow-green'
                  : 'border-slate-700 bg-slate-900/50 text-slate-500 hover:text-slate-300'
              )}
            >
              <ArchLogo className="h-4 w-4" />
              <span className="text-xs font-medium">Arch</span>
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-slate-700" />

            {/* Ubuntu Button */}
            <button
              onClick={() => setMode('ubuntu')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-all duration-200',
                !isArch
                  ? 'border-terminal-orange/50 bg-terminal-orange/10 text-terminal-orange shadow-glow-orange'
                  : 'border-slate-700 bg-slate-900/50 text-slate-500 hover:text-slate-300'
              )}
            >
              <UbuntuLogo className="h-4 w-4" />
              <span className="text-xs font-medium">Ubuntu</span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Switch between Arch Linux and Ubuntu Server expertise
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
