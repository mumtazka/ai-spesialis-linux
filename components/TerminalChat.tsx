'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Terminal, Menu, PanelRight } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { TerminalHeader } from './TerminalHeader'
import { NewsFeed } from './NewsFeed'
import { SystemContext } from './SystemContext'
import { ChatMessage } from './ChatMessage'
import { TerminalInput } from './TerminalInput'
import { Message, ArchNews, SystemContext as SystemContextType } from '@/types'

interface TerminalChatProps {
  user?: {
    id: string
    email: string
    username?: string
    avatar_url?: string
  } | null
  initialSystemContext?: SystemContextType | null
  initialNews?: ArchNews[]
  onLogout?: () => void
  onSaveSystemContext?: (data: SystemContextType) => Promise<void>
}

export function TerminalChat({
  user,
  initialSystemContext,
  initialNews,
  onLogout,
  onSaveSystemContext,
}: TerminalChatProps) {
  const { messages, addMessage, updateLastMessage, setLoading, isLoading, clearChat } = useChatStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (!userScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, userScrolled])

  // Handle scroll events to detect if user scrolled up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
    setUserScrolled(!isAtBottom)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+L to clear chat
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        if (confirm('Clear chat history?')) {
          clearChat()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearChat])

  // Send message handler
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return

    // Add user message
    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      role: 'user',
      content,
      files: files?.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
    }
    addMessage(userMessage)

    // Start loading
    setLoading(true)
    setIsStreaming(true)

    try {
      // Call API - filter out empty messages
      const validMessages = [...messages, { ...userMessage, id: 'temp', created_at: new Date().toISOString() }]
        .filter(m => m.content && m.content.trim().length > 0)

      // Use direct Edge Function client (My updated implementation)
      // This bypasses local API routes and uses robust stream parsing
      const { streamChatCompletion } = await import('@/lib/ai/gemini')

      let assistantContent = ''

      // Add initial assistant message
      addMessage({
        role: 'assistant',
        content: '',
      })

      // Stream the response directly from Edge Function
      for await (const chunk of streamChatCompletion(validMessages, 'chat', initialSystemContext)) {
        if (chunk.text) {
          assistantContent += chunk.text
          updateLastMessage(assistantContent)
        }

        // Handling for immediate done is inside the generator, 
        // but we ensure we update if any text arrived
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      })
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <TerminalHeader
        user={user}
        onLogout={onLogout}
        onResetChat={clearChat}
        connectionStatus="connected"
        showContext={showContext}
        onToggleContext={() => setShowContext(!showContext)}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-14">
        {/* Left Sidebar - News Feed (Desktop) */}
        <NewsFeed userDistro={initialSystemContext?.distro_type} />

        {/* Center - Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Sidebar Toggles */}
          <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-slate-800">
            {/* News Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400">
                  <Menu className="h-4 w-4 mr-2" />
                  News
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-slate-950 border-slate-800">
                <NewsFeed userDistro={initialSystemContext?.distro_type} />
              </SheetContent>
            </Sheet>

            {/* Context Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400">
                  <PanelRight className="h-4 w-4 mr-2" />
                  System Context
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 bg-slate-950 border-slate-800">
                <SystemContext
                  initialData={initialSystemContext}
                  onSave={onSaveSystemContext}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Messages Area */}
          <ScrollArea
            className="flex-1"
            onScrollCapture={handleScroll}
          >
            <div className="max-w-4xl mx-auto">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="h-16 w-16 rounded-sm flex items-center justify-center mb-4 bg-terminal-green/10 border border-terminal-green/30">
                    <Terminal className="h-8 w-8 text-terminal-green" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-100 mb-2">
                    Welcome, {user?.username || 'User'}
                  </h1>
                  <p className="text-sm text-slate-400 text-center max-w-md mb-6">
                    Your Linux Assistant is ready. System context:
                    <br />
                    <span className="text-terminal-green font-mono">
                      {initialSystemContext?.distro_type || 'Unknown Distro'} {initialSystemContext?.distro_version}
                    </span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      'Update my system packages',
                      'Check disk usage',
                      'Configure firewall',
                      'Troubleshoot network',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-sm border transition-all',
                          'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                          'hover:border-terminal-green/50 hover:text-terminal-green'
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Loading Indicator */}
              {isLoading && !isStreaming && (
                <div className="flex items-center gap-2 px-4 py-4">
                  <div className="h-8 w-8 relative flex items-center justify-center">
                    {/* <span className="text-lg font-mono text-terminal-green">
                      ⠋
                    </span> */}
                    <img
                      src="/loading.gif"
                      alt="Thinking..."
                      className="h-full w-full object-contain opacity-80"
                    />
                  </div>
                  <span className="text-sm text-slate-500 animate-pulse">
                    Thinking...
                  </span>
                </div>
              )}

              {/* Scroll Anchor */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Scroll to Bottom Button */}
          {userScrolled && (
            <button
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                setUserScrolled(false)
              }}
              className={cn(
                'absolute bottom-24 left-1/2 -translate-x-1/2',
                'px-3 py-1.5 rounded-full text-xs font-medium',
                'bg-slate-800 text-slate-300 shadow-lg',
                'hover:bg-slate-700 transition-colors',
                'flex items-center gap-1.5'
              )}
            >
              <span>↓</span>
              New messages
            </button>
          )}

          {/* Input Area */}
          <TerminalInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder={`Ask about ${initialSystemContext?.distro_type || 'Linux'}...`}
            user={user}
            distro={initialSystemContext?.distro_type}
          />
        </div>

        {/* Right Sidebar - System Context (Desktop) */}
        {showContext && (
          <div className="hidden lg:block w-80 border-l border-slate-800">
            <SystemContext
              initialData={initialSystemContext}
              onSave={onSaveSystemContext}
            />
          </div>
        )}
      </div>
    </div>
  )
}
