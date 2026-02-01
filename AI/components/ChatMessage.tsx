'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Terminal, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { useModeStore } from '@/store/modeStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Message, SafetyLevel } from '@/types'
import { CommandSafetyBadge } from './CommandSafetyBadge'
import { analyzeTextForSafety, extractCommandsFromText } from '@/lib/commands'

interface ChatMessageProps {
  message: Message
  showSafety?: boolean
}

// Custom code block component with syntax highlighting
function CodeBlock({
  language,
  value,
  filename,
}: {
  language: string
  value: string
  filename?: string
}) {
  const [copied, setCopied] = useState(false)
  const { mode } = useModeStore()
  const isArch = mode === 'arch'

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  // Analyze safety of code content
  const safetyAnalysis = analyzeTextForSafety(value)
  const hasCommands = extractCommandsFromText(value).length > 0

  return (
    <div className="code-block-wrapper my-3">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 border-b-0 rounded-t-sm">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-mono">
            {filename || language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasCommands && safetyAnalysis.level !== 'safe' && (
            <CommandSafetyBadge
              level={safetyAnalysis.level}
              reason={safetyAnalysis.reason}
              size="sm"
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            className="h-6 w-6 text-slate-400 hover:text-slate-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-terminal-green" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.125rem 0.125rem',
          border: '1px solid rgb(51, 65, 85)',
          borderTop: 'none',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: 'rgb(100, 116, 139)',
          fontSize: '0.75rem',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export function ChatMessage({ message, showSafety = true }: ChatMessageProps) {
  const { mode, getModeColor } = useModeStore()
  const isUser = message.role === 'user'
  const isArch = mode === 'arch'
  const accentColor = getModeColor()

  // Get safety info from message metadata
  const safetyLevel = message.metadata?.safetyLevel as SafetyLevel | undefined

  return (
    <div
      className={cn(
        'message-enter py-4',
        isUser ? 'px-4' : 'px-4'
      )}
    >
      <div
        className={cn(
          'flex gap-3',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex-shrink-0 h-8 w-8 rounded-sm flex items-center justify-center',
            isUser
              ? 'bg-slate-700'
              : isArch
              ? 'bg-terminal-green/10 border border-terminal-green/30'
              : 'bg-terminal-orange/10 border border-terminal-orange/30'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-slate-400" />
          ) : (
            <Terminal
              className={cn(
                'h-4 w-4',
                isArch ? 'text-terminal-green' : 'text-terminal-orange'
              )}
            />
          )}
        </div>

        {/* Message Content */}
        <div
          className={cn(
            'flex-1 max-w-[85%]',
            isUser && 'text-right'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center gap-2 mb-1',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            <span className="text-xs font-medium text-slate-400">
              {isUser ? 'You' : 'LinuxExpert AI'}
            </span>
            <span className="text-[10px] text-slate-600">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            
            {/* Safety Badge for Assistant Messages */}
            {!isUser && showSafety && safetyLevel && safetyLevel !== 'safe' && (
              <CommandSafetyBadge
                level={safetyLevel}
                reason={message.metadata?.reasoning}
                size="sm"
              />
            )}
          </div>

          {/* Content */}
          <div
            className={cn(
              'inline-block text-left rounded-sm p-3',
              isUser
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900/50 border-l-4',
              !isUser &&
                (isArch
                  ? 'border-terminal-green/50'
                  : 'border-terminal-orange/50')
            )}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-content text-sm text-slate-200">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const language = match ? match[1] : 'bash'
                      
                      // Extract filename if present: ```bash:filename.sh
                      const filenameMatch = className?.match(/language-\w+:(.+)/)
                      const filename = filenameMatch ? filenameMatch[1] : undefined

                      return !inline && match ? (
                        <CodeBlock
                          language={language}
                          value={String(children).replace(/\n$/, '')}
                          filename={filename}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    },
                    pre({ children }) {
                      return <>{children}</>
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Files (if any) */}
          {message.files && message.files.length > 0 && (
            <div
              className={cn(
                'flex gap-2 mt-2 flex-wrap',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              {message.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-sm text-xs text-slate-400"
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <span className="text-slate-600">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
