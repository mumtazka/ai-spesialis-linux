'use client'

import { useState } from 'react'
import { Terminal, LogOut, User, Wifi, WifiOff, Settings } from 'lucide-react'
import { useModeStore } from '@/store/modeStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { ModeToggle } from './ModeToggle'

interface TerminalHeaderProps {
  user?: {
    id: string
    email: string
    username?: string
    avatar_url?: string
  } | null
  onLogout?: () => void
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
}

export function TerminalHeader({
  user,
  onLogout,
  connectionStatus = 'connected',
}: TerminalHeaderProps) {
  const { mode, getModeColor } = useModeStore()
  const [showSettings, setShowSettings] = useState(false)

  const modeColor = getModeColor()
  const isArch = mode === 'arch'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-sm border',
              isArch
                ? 'border-terminal-green/50 bg-terminal-green/10'
                : 'border-terminal-orange/50 bg-terminal-orange/10'
            )}
          >
            <Terminal
              className={cn(
                'h-4 w-4',
                isArch ? 'text-terminal-green' : 'text-terminal-orange'
              )}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100">
              LinuxExpert AI
            </span>
            <span className="text-[10px] text-slate-500">
              {isArch ? 'Arch Linux Expert' : 'Ubuntu Server Architect'}
            </span>
          </div>
        </div>

        {/* Center - Mode Toggle */}
        <div className="hidden sm:flex items-center">
          <ModeToggle />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-sm bg-slate-900/50">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="h-3 w-3 text-terminal-green" />
                <span className="text-[10px] text-slate-400">online</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Wifi className="h-3 w-3 text-terminal-yellow animate-pulse" />
                <span className="text-[10px] text-slate-400">...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-terminal-red" />
                <span className="text-[10px] text-slate-400">offline</span>
              </>
            )}
          </div>

          {/* Settings Button (Mobile) */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden text-slate-400 hover:text-slate-100"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.username || user.email}
                    />
                    <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                      {(user.username || user.email)
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-slate-900 border-slate-700"
                align="end"
                forceMount
              >
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.username || user.email}
                    />
                    <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                      {(user.username || user.email)
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">
                      {user.username || user.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-slate-400 hover:text-slate-100"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Mode Toggle */}
      {showSettings && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950/95 px-4 py-2">
          <ModeToggle />
        </div>
      )}
    </header>
  )
}
