'use client'

import { useState, useEffect } from 'react'
import { Save, Server, Cpu, Monitor, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { SystemContext as SystemContextType } from '@/types'

interface SystemContextProps {
  initialData?: SystemContextType | null
  onSave?: (data: SystemContextType) => Promise<void>
  isLoading?: boolean
}

export function SystemContext({
  initialData,
  onSave,
  isLoading: externalLoading = false,
}: SystemContextProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<SystemContextType>({
    distro_type: initialData?.distro_type || '',
    distro_version: initialData?.distro_version || '',
    kernel_version: initialData?.kernel_version || '',
    de_wm: initialData?.de_wm || '',
    gpu: initialData?.gpu || '',
    packages: initialData?.packages || '',
    additional_setup_notes: initialData?.additional_setup_notes || '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        distro_type: initialData.distro_type || '',
        distro_version: initialData.distro_version || '',
        kernel_version: initialData.kernel_version || '',
        de_wm: initialData.de_wm || '',
        gpu: initialData.gpu || '',
        packages: initialData.packages || '',
        additional_setup_notes: initialData.additional_setup_notes || '',
      })
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

  // Simple check if form data differs from initial data
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData)

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Server className="h-4 w-4 text-terminal-green" />
        <h2 className="text-sm font-semibold text-slate-100">System Context</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Distro */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Distribution Name
          </Label>
          <Input
            placeholder="e.g. Arch Linux, Ubuntu, Fedora"
            value={formData.distro_type}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, distro_type: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm focus-visible:ring-terminal-green/50"
          />
        </div>

        {/* Distro Version */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Version / Release
          </Label>
          <Input
            placeholder="e.g. Rolling, 24.04 LTS, 40"
            value={formData.distro_version || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, distro_version: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm focus-visible:ring-terminal-green/50"
          />
        </div>

        {/* Kernel Version */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            Kernel Version
          </Label>
          <Input
            placeholder="e.g. 6.8.1-arch1-1"
            value={formData.kernel_version || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, kernel_version: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm focus-visible:ring-terminal-green/50"
          />
          <p className="text-[10px] text-slate-500">Run: uname -r</p>
        </div>

        {/* DE/WM */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Desktop / Window Manager
          </Label>
          <Input
            placeholder="e.g. GNOME, KDE, Hyprland, i3"
            value={formData.de_wm || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, de_wm: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm focus-visible:ring-terminal-green/50"
          />
        </div>

        {/* GPU */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            GPU / Driver
          </Label>
          <Input
            placeholder="e.g. NVIDIA RTX 3060, AMD, Intel"
            value={formData.gpu || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, gpu: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm focus-visible:ring-terminal-green/50"
          />
        </div>

        <Separator className="bg-slate-800" />

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            Additional Setup Notes
          </Label>
          <Textarea
            placeholder="Any special configurations? e.g. Wayland, Pipewire, Hardened Kernel..."
            value={formData.additional_setup_notes || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, additional_setup_notes: e.target.value }))
            }
            disabled={externalLoading}
            className="text-sm min-h-[80px] focus-visible:ring-terminal-green/50"
          />
        </div>

        {/* Critical Packages */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Key Packages List
          </Label>
          <Textarea
            placeholder="Paste important package versions here..."
            value={formData.packages || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, packages: e.target.value }))
            }
            disabled={externalLoading}
            className="text-xs min-h-[100px] font-mono focus-visible:ring-terminal-green/50"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || externalLoading}
          className="w-full text-sm bg-terminal-green/10 text-terminal-green border border-terminal-green/50 hover:bg-terminal-green/20"
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
