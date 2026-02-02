'use client'

import { useState } from 'react'
import { Terminal, LogOut, User, Wifi, WifiOff, Settings, RotateCcw, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface TerminalHeaderProps {
  user?: {
    id: string
    email: string
    username?: string
    avatar_url?: string
  } | null
  onLogout?: () => void
  onResetChat?: () => void
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
  showContext?: boolean
  onToggleContext?: () => void
}

export function TerminalHeader({
  user,
  onLogout,
  onResetChat,
  connectionStatus = 'connected',
  showContext,
  onToggleContext,
}: TerminalHeaderProps) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-terminal-green/50 bg-terminal-green/10">
            <Terminal className="h-4 w-4 text-terminal-green" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100">
              LinuxExpert AI
            </span>
            <span className="text-[10px] text-slate-500">
              Terminal Assistant
            </span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Reset Chat Button */}
          {onResetChat && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-terminal-green hover:bg-terminal-green/10"
                    onClick={onResetChat}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-800 text-slate-200 border-slate-700">
                  <p className="text-xs">New Chat (Ctrl+L)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}



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
                      {user.username}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">
                      {user.email || 'Local User'}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-slate-300 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                  onClick={onToggleContext}
                >
                  <PanelRight className="mr-2 h-4 w-4" />
                  System Context
                </DropdownMenuItem>
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
    </header>
  )
}
