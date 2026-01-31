'use client'

import { useState } from 'react'
import { Terminal, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface ProfileData {
    distro_type: string
    distro_version: string
    kernel_version: string
    de_wm: string
    gpu: string
    additional_setup_notes: string
}

interface ProfileSetupFormProps {
    username: string
    onSave: (data: ProfileData) => Promise<void>
    isSaving: boolean
}

export function ProfileSetupForm({ username, onSave, isSaving }: ProfileSetupFormProps) {
    const [formData, setFormData] = useState<ProfileData>({
        distro_type: 'Arch Linux',
        distro_version: 'Rolling',
        kernel_version: '',
        de_wm: '',
        gpu: '',
        additional_setup_notes: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
            <div className="max-w-2xl w-full space-y-8 bg-slate-900/50 p-8 rounded-lg border border-slate-800">
                <div className="flex flex-col items-start border-b border-slate-800 pb-6 w-full">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-terminal-green/10 rounded-lg flex items-center justify-center">
                            <Terminal className="h-6 w-6 text-terminal-green" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
                            <p className="text-slate-400 text-sm">
                                Setup profile for user <span className="font-mono text-terminal-green">@{username}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <Alert className="bg-blue-900/20 border-blue-900/50 text-blue-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Why is this needed?</AlertTitle>
                    <AlertDescription className="text-blue-200/80 text-xs">
                        The AI uses this profile to tailor every command, path, and solution specifically to your system.
                    </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="distro">Linux Distribution *</Label>
                            <Input
                                id="distro"
                                placeholder="e.g. Arch Linux, Ubuntu, Fedora"
                                value={formData.distro_type}
                                onChange={(e) => setFormData({ ...formData, distro_type: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="version">Distro Version</Label>
                            <Input
                                id="version"
                                placeholder="e.g. 24.04 LTS, Rolling, 39"
                                value={formData.distro_version}
                                onChange={(e) => setFormData({ ...formData, distro_version: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="kernel">Kernel Version (Optional)</Label>
                            <Input
                                id="kernel"
                                placeholder="e.g. 6.8.9-arch1-1"
                                value={formData.kernel_version}
                                onChange={(e) => setFormData({ ...formData, kernel_version: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dewm">Desktop Env / Window Manager</Label>
                            <Input
                                id="dewm"
                                placeholder="e.g. GNOME, KDE, Hyprland, i3"
                                value={formData.de_wm}
                                onChange={(e) => setFormData({ ...formData, de_wm: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="gpu">GPU Driver</Label>
                            <Input
                                id="gpu"
                                placeholder="e.g. NVIDIA 550, Mesa (AMD/Intel)"
                                value={formData.gpu}
                                onChange={(e) => setFormData({ ...formData, gpu: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notes">Additional Setup Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="e.g. Using ZFS root, Wayland only, secure boot enabled, etc."
                                value={formData.additional_setup_notes}
                                onChange={(e) => setFormData({ ...formData, additional_setup_notes: e.target.value })}
                                className="bg-slate-900 border-slate-700 focus:border-terminal-green min-h-[100px]"
                            />
                            <p className="text-xs text-slate-500">
                                Any specific configurations the AI should be aware of.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            type="submit"
                            className={cn(
                                "bg-terminal-green hover:bg-terminal-green/90 text-slate-950 font-bold min-w-[150px]",
                                isSaving && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">⠋</span> Saving Profile...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" /> Save & Continue
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
