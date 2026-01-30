'use client'

import { ShieldCheck, AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react'
import { useModeStore } from '@/store/modeStore'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SafetyLevel } from '@/types'

interface CommandSafetyBadgeProps {
  level: SafetyLevel
  command?: string
  reason?: string
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SAFETY_CONFIG: Record<
  SafetyLevel,
  {
    icon: typeof ShieldCheck
    label: string
    variant: string
    glowClass: string
  }
> = {
  safe: {
    icon: ShieldCheck,
    label: 'Safe',
    variant: 'arch',
    glowClass: 'shadow-glow-green',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Caution',
    variant: 'warning',
    glowClass: 'shadow-glow-orange',
  },
  danger: {
    icon: ShieldAlert,
    label: 'Danger',
    variant: 'danger',
    glowClass: 'shadow-glow-red',
  },
}

export function CommandSafetyBadge({
  level,
  command,
  reason,
  showTooltip = true,
  size = 'sm',
}: CommandSafetyBadgeProps) {
  const { mode } = useModeStore()
  const config = SAFETY_CONFIG[level] || SAFETY_CONFIG.safe
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  const badge = (
    <Badge
      variant={config.variant as any}
      className={cn(
        'font-mono font-medium inline-flex items-center',
        sizeClasses[size],
        level === 'danger' && 'safety-badge-pulse'
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-900 border-slate-700 p-3"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  'h-4 w-4',
                  level === 'safe' && 'text-terminal-green',
                  level === 'caution' && 'text-terminal-yellow',
                  level === 'danger' && 'text-terminal-red'
                )}
              />
              <span
                className={cn(
                  'font-semibold text-sm',
                  level === 'safe' && 'text-terminal-green',
                  level === 'caution' && 'text-terminal-yellow',
                  level === 'danger' && 'text-terminal-red'
                )}
              >
                {config.label}
              </span>
            </div>
            
            {reason && (
              <p className="text-xs text-slate-300 leading-relaxed">{reason}</p>
            )}
            
            {command && (
              <div className="mt-2">
                <p className="text-[10px] text-slate-500 mb-1">Detected command:</p>
                <code className="block bg-slate-800 px-2 py-1 rounded text-[10px] font-mono text-slate-300 break-all">
                  {command.length > 60 ? command.slice(0, 60) + '...' : command}
                </code>
              </div>
            )}
            
            {level === 'danger' && (
              <p className="text-[10px] text-terminal-red font-medium">
                ⚠️ Review carefully before executing!
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline version for use in code blocks
export function InlineSafetyIndicator({
  level,
  onClick,
}: {
  level: SafetyLevel
  onClick?: () => void
}) {
  const config = SAFETY_CONFIG[level] || SAFETY_CONFIG.safe
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all',
        'hover:opacity-80',
        level === 'safe' && 'bg-terminal-green/20 text-terminal-green',
        level === 'caution' && 'bg-terminal-yellow/20 text-terminal-yellow',
        level === 'danger' && 'bg-terminal-red/20 text-terminal-red safety-badge-pulse'
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </button>
  )
}
