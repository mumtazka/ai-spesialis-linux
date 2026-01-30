'use client'

import { useState, useEffect } from 'react'
import { Save, Server, Cpu, Monitor, Package, Loader2 } from 'lucide-react'
import { useModeStore } from '@/store/modeStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { SystemContext as SystemContextType } from '@/types'

interface SystemContextProps {
  initialData?: SystemContextType | null
  onSave?: (data: SystemContextType) => Promise<void>
  isLoading?: boolean
}

const DISTRO_OPTIONS = [
  { value: 'arch', label: 'Arch Linux' },
  { value: 'ubuntu-22.04', label: 'Ubuntu Server 22.04 LTS' },
  { value: 'ubuntu-24.04', label: 'Ubuntu Server 24.04 LTS' },
]

const GPU_OPTIONS = [
  { value: 'nvidia', label: 'NVIDIA' },
  { value: 'amd', label: 'AMD' },
  { value: 'intel', label: 'Intel' },
  { value: 'none', label: 'None / VM' },
]

const DE_WM_OPTIONS = [
  'Hyprland',
  'i3',
  'sway',
  'KDE Plasma',
  'GNOME',
  'Xfce',
  'LXQt',
  'Server/Headless',
  'Other',
]

export function SystemContext({
  initialData,
  onSave,
  isLoading: externalLoading = false,
}: SystemContextProps) {
  const { mode, getModeColor } = useModeStore()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<SystemContextType>({
    distro_type: initialData?.distro_type || (mode === 'arch' ? 'arch' : 'ubuntu-22.04'),
    kernel_version: initialData?.kernel_version || '',
    de_wm: initialData?.de_wm || '',
    gpu: initialData?.gpu || 'none',
    packages: initialData?.packages || '',
  })

  const isArch = mode === 'arch'
  const accentColor = getModeColor()

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData)

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Server className={cn('h-4 w-4', `text-${accentColor}`)} />
        <h2 className="text-sm font-semibold text-slate-100">System Context</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Distro Select */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Distribution
          </Label>
          <Select
            value={formData.distro_type}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, distro_type: value as SystemContextType['distro_type'] }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className={cn('text-sm', `focus:ring-${accentColor}/50`)}>
              <SelectValue placeholder="Select distribution" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {DISTRO_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-slate-100 focus:bg-slate-800"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kernel Version */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            Kernel Version
          </Label>
          <Input
            placeholder={isArch ? '6.8.1-arch1-1' : '5.15.0-91-generic'}
            value={formData.kernel_version}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, kernel_version: e.target.value }))
            }
            disabled={externalLoading}
            className={cn('text-sm', `focus-visible:ring-${accentColor}/50`)}
          />
          <p className="text-[10px] text-slate-500">
            Run: {isArch ? 'uname -r' : 'uname -r'}
          </p>
        </div>

        {/* DE/WM */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Desktop Environment / Window Manager
          </Label>
          <Select
            value={formData.de_wm}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, de_wm: value }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className={cn('text-sm', `focus:ring-${accentColor}/50`)}>
              <SelectValue placeholder="Select DE/WM" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {DE_WM_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  className="text-slate-100 focus:bg-slate-800"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPU */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            GPU
          </Label>
          <Select
            value={formData.gpu}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, gpu: value as SystemContextType['gpu'] }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className={cn('text-sm', `focus:ring-${accentColor}/50`)}>
              <SelectValue placeholder="Select GPU" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {GPU_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-slate-100 focus:bg-slate-800"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-slate-800" />

        {/* Critical Packages */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Critical Packages
          </Label>
          <Textarea
            placeholder={
              isArch
                ? `# Output dari: pacman -Q | grep -E "(nvidia|kernel|mesa)"
nvidia 545.29.06-1
linux 6.8.1.arch1-1
mesa1:24.0.3-1`
                : `# Output dari: dpkg -l | grep -E "(nvidia|kernel|mesa)"
ii  nvidia-driver-545 ...
ii  linux-image-5.15.0-91 ...`
            }
            value={formData.packages}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, packages: e.target.value }))
            }
            disabled={externalLoading}
            className={cn(
              'text-xs min-h-[120px] font-mono',
              `focus-visible:ring-${accentColor}/50`
            )}
          />
          <p className="text-[10px] text-slate-500">
            Helps diagnose package-related issues faster
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || externalLoading}
          className={cn(
            'w-full text-sm',
            isArch
              ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/50 hover:bg-terminal-green/20'
              : 'bg-terminal-orange/10 text-terminal-orange border border-terminal-orange/50 hover:bg-terminal-orange/20'
          )}
          variant="outline"
        >
          {isSaving || externalLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Context
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
