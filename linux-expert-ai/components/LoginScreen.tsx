'use client'

import { useState } from 'react'
import { Terminal, ArrowRight, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface LoginScreenProps {
    onLogin: (username: string) => Promise<void>
    isLoading: boolean
}

export function LoginScreen({ onLogin, isLoading }: LoginScreenProps) {
    const [username, setUsername] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (username.trim()) {
            onLogin(username.trim())
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
            <div className="max-w-md w-full space-y-8 bg-slate-900/50 p-8 rounded-lg border border-slate-800">
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-2 ring-slate-700">
                        <Terminal className="h-8 w-8 text-terminal-green" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Linux Expert AI</h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        Enter your username to access your secure terminal session.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-slate-300">
                            Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                            <Input
                                id="username"
                                type="text"
                                placeholder="root"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 bg-slate-900 border-slate-700 text-slate-100 focus:ring-terminal-green focus:border-terminal-green transition-all"
                                disabled={isLoading}
                                autoFocus
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Use a unique username. New users will be prompted to set up a profile.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className={cn(
                            "w-full bg-terminal-green hover:bg-terminal-green/90 text-slate-950 font-bold transition-all",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isLoading || !username.trim()}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">⠋</span> Connecting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Login <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </Button>
                </form>

                <div className="text-center text-xs text-slate-600">
                    <p>System v2.0 &bull; Secure Shell Access</p>
                </div>
            </div>
        </div>
    )
}
