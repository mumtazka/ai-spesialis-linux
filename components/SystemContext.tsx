'use client'

import { useState, useEffect } from 'react'
import { Save, Server, Cpu, Monitor, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
          <Select
            value={formData.distro_type}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, distro_type: value }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className="text-sm focus:ring-terminal-green/50">
              <SelectValue placeholder="Select Distribution" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Arch Linux", "Debian", "Ubuntu", "Fedora", "openSUSE",
                "CentOS", "RHEL", "Alpine Linux", "Gentoo", "Slackware",
                "Linux Mint", "Manjaro", "Pop!_OS", "Solus", "Void Linux",
                "NixOS", "Kali Linux", "Other"
              ].map((distro) => (
                <SelectItem key={distro} value={distro}>
                  {distro}
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
          <Select
            value={formData.kernel_version}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, kernel_version: value }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className="text-sm focus:ring-terminal-green/50">
              <SelectValue placeholder="Select Kernel" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Linux Stable", "Linux LTS", "Linux Zen", "Linux Hardened",
                "Linux Hard Real-Time", "Distribution Default"
              ].map((kernel) => (
                <SelectItem key={kernel} value={kernel}>
                  {kernel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DE/WM */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="h-3 w-3" />
            Desktop / Window Manager
          </Label>
          <Select
            value={formData.de_wm}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, de_wm: value }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className="text-sm focus:ring-terminal-green/50">
              <SelectValue placeholder="Select DE/WM" />
            </SelectTrigger>
            <SelectContent>
              {[
                "GNOME", "KDE Plasma", "XFCE", "Mate", "Cinnamon", "LXQt",
                "Budgie", "I3", "Sway", "Hyprland", "Bspwm", "Awesome",
                "Openbox", "None (Headless)", "Other"
              ].map((de) => (
                <SelectItem key={de} value={de}>
                  {de}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPU */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3 w-3" />
            GPU / Driver
          </Label>
          <Select
            value={formData.gpu}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, gpu: value }))
            }
            disabled={externalLoading}
          >
            <SelectTrigger className="text-sm focus:ring-terminal-green/50">
              <SelectValue placeholder="Select GPU Type" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Integrated (Intel)", "Integrated (AMD)",
                "Discrete (NVIDIA Proprietary)", "Discrete (NVIDIA Open Source)",
                "Discrete (AMD)", "Discrete (Intel Arc)",
                "Software Rendering", "Other"
              ].map((gpu) => (
                <SelectItem key={gpu} value={gpu}>
                  {gpu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
