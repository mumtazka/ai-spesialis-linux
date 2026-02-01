'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { useModeStore } from '@/store/modeStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { FileDropZone } from './FileDropZone'

interface TerminalInputProps {
  onSend: (message: string, files?: File[]) => void
  isLoading?: boolean
  placeholder?: string
}

export function TerminalInput({
  onSend,
  isLoading = false,
  placeholder = 'Type your message...',
}: TerminalInputProps) {
  const { mode, getModeColor } = useModeStore()
  const [input, setInput] = useState('')
  const [showFileDrop, setShowFileDrop] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isArch = mode === 'arch'
  const accentColor = getModeColor()

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 120) // Max 5 rows
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  // Focus input on Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && attachedFiles.length === 0) return
    if (isLoading) return

    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined)
    setInput('')
    setAttachedFiles([])
    setShowFileDrop(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, attachedFiles, isLoading, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFilesSelected = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
  }

  const handleFileRemove = () => {
    // FileDropZone handles its own state, we just track attached files
  }

  // Generate terminal prompt based on mode
  const getPrompt = () => {
    const hostname = isArch ? 'arch-pc' : 'ubuntu-server'
    const user = 'user'
    const cwd = '~'
    
    if (isArch) {
      return `┌──(${user}㉿${hostname})-[${cwd}]`
    }
    return `${user}@${hostname}:${cwd}$`
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      {/* File Drop Zone (collapsible) */}
      {showFileDrop && (
        <div className="px-4 py-3 border-b border-slate-800">
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            onFileRemove={handleFileRemove}
            maxFiles={5}
          />
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && !showFileDrop && (
        <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Attached:</span>
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs',
                isArch
                  ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/30'
                  : 'bg-terminal-orange/10 text-terminal-orange border border-terminal-orange/30'
              )}
            >
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() =>
                  setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
                }
                className="hover:text-terminal-red"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setAttachedFiles([])}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Terminal Prompt */}
          <div className="hidden sm:flex flex-col text-xs font-mono text-slate-500 pt-2">
            <span className={cn(isArch ? 'text-terminal-green' : 'text-terminal-orange')}>
              {getPrompt()}
            </span>
            <span>└─$</span>
          </div>

          {/* Textarea */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'Thinking...' : placeholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                'min-h-[40px] max-h-[120px] pr-10 resize-none',
                'bg-slate-900/80 border-slate-700',
                'placeholder:text-slate-600',
                `focus-visible:ring-${accentColor}/50 focus-visible:border-${accentColor}/50`,
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
            
            {/* Character count (shows when typing) */}
            {input.length > 0 && (
              <span className="absolute bottom-1 right-2 text-[10px] text-slate-600">
                {input.length}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Attachment Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFileDrop(!showFileDrop)}
              className={cn(
                'text-slate-500 hover:text-slate-300',
                showFileDrop && (isArch ? 'text-terminal-green' : 'text-terminal-orange')
              )}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
              className={cn(
                'transition-all duration-200',
                isArch
                  ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/50 hover:bg-terminal-green/20 hover:shadow-glow-green'
                  : 'bg-terminal-orange/10 text-terminal-orange border border-terminal-orange/50 hover:bg-terminal-orange/20 hover:shadow-glow-orange',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
              )}
              variant="outline"
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">Enter</kbd>
            {' '}to send{' '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500 ml-1">Shift+Enter</kbd>
            {' '}for new line
          </p>
          <p className="text-[10px] text-slate-600">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500">Ctrl+/</kbd>
            {' '}focus
          </p>
        </div>
      </div>
    </div>
  )
}
