'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Message, ChatSession, SafetyLevel, SafetyAnalysis } from '@/types'
import { generateId } from '@/lib/utils'
import { analyzeTextForSafety } from '@/lib/commands'

interface ChatState {
  // Current session
  currentSession: ChatSession | null
  messages: Message[]
  
  // UI States
  isLoading: boolean
  isStreaming: boolean
  
  // Actions
  setCurrentSession: (session: ChatSession | null) => void
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void
  updateLastMessage: (content: string, metadata?: Message['metadata']) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  clearChat: () => void
  deleteMessage: (messageId: string) => void
  
  // Safety analysis
  getSafetyStatus: (messageId: string) => SafetyAnalysis | null
  
  // Session management
  createNewSession: (userId: string, mode: 'arch' | 'ubuntu', title?: string) => ChatSession
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      messages: [],
      isLoading: false,
      isStreaming: false,

      setCurrentSession: (session) => {
        set({ currentSession: session })
      },

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          created_at: new Date().toISOString(),
        }
        
        // Auto-analyze safety for assistant messages
        if (message.role === 'assistant') {
          const safetyAnalysis = analyzeTextForSafety(message.content)
          if (safetyAnalysis.level !== 'safe') {
            newMessage.metadata = {
              ...newMessage.metadata,
              safetyLevel: safetyAnalysis.level,
              detectedCommands: safetyAnalysis.detectedPatterns,
            }
          }
        }
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
      },

      updateLastMessage: (content, metadata) => {
        set((state) => {
          const messages = [...state.messages]
          const lastMessage = messages[messages.length - 1]
          
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = content
            if (metadata) {
              lastMessage.metadata = { ...lastMessage.metadata, ...metadata }
            }
            
            // Re-analyze safety on update
            const safetyAnalysis = analyzeTextForSafety(content)
            if (safetyAnalysis.level !== 'safe') {
              lastMessage.metadata = {
                ...lastMessage.metadata,
                safetyLevel: safetyAnalysis.level,
                detectedCommands: safetyAnalysis.detectedPatterns,
              }
            }
          }
          
          return { messages }
        })
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearChat: () => {
        set({
          messages: [],
          currentSession: null,
        })
      },

      deleteMessage: (messageId) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== messageId),
        }))
      },

      getSafetyStatus: (messageId) => {
        const message = get().messages.find((m) => m.id === messageId)
        if (!message || !message.metadata?.safetyLevel) return null
        
        return {
          level: message.metadata.safetyLevel as SafetyLevel,
          reason: message.metadata.reasoning || 'Safety analysis completed.',
          detectedPatterns: message.metadata.detectedCommands || [],
        }
      },

      createNewSession: (userId, mode, title) => {
        const session: ChatSession = {
          id: generateId(),
          user_id: userId,
          title: title || `New Chat - ${new Date().toLocaleString()}`,
          mode,
          created_at: new Date().toISOString(),
        }
        
        set({
          currentSession: session,
          messages: [],
        })
        
        return session
      },
    }),
    {
      name: 'linuxexpert-chat',
      version: 1,
      partialize: (state) => ({
        currentSession: state.currentSession,
        messages: state.messages.slice(-50), // Only persist last 50 messages
      }),
    }
  )
)
