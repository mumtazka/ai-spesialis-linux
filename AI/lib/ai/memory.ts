/**
 * Conversation Memory Manager
 * Handles context persistence and conversation state
 */

import { Message, SystemContext } from '@/types'

export interface ConversationState {
    sessionId: string
    messages: Message[]
    systemContext?: SystemContext
    metadata: {
        startedAt: string
        lastMessageAt: string
        messageCount: number
    }
}

// In-memory storage for conversation state
// In production, this would be backed by Supabase or similar
const conversationStore = new Map<string, ConversationState>()

// Maximum messages to keep in context (to avoid token limits)
const MAX_CONTEXT_MESSAGES = 20

/**
 * Get or create a conversation state
 */
export function getConversation(sessionId: string): ConversationState {
    const existing = conversationStore.get(sessionId)

    if (existing) {
        return existing
    }

    const newState: ConversationState = {
        sessionId,
        messages: [],
        metadata: {
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 0,
        },
    }

    conversationStore.set(sessionId, newState)
    return newState
}

/**
 * Add a message to conversation history
 */
export function addMessage(
    sessionId: string,
    message: Message
): ConversationState {
    const state = getConversation(sessionId)

    state.messages.push(message)
    state.metadata.lastMessageAt = new Date().toISOString()
    state.metadata.messageCount++

    // Trim old messages if exceeding limit
    if (state.messages.length > MAX_CONTEXT_MESSAGES) {
        // Keep system messages and recent messages
        const systemMessages = state.messages.filter((m) => m.role === 'system')
        const recentMessages = state.messages
            .filter((m) => m.role !== 'system')
            .slice(-MAX_CONTEXT_MESSAGES + systemMessages.length)

        state.messages = [...systemMessages, ...recentMessages]
    }

    return state
}

/**
 * Get messages for AI context
 * Returns messages formatted for the conversation
 */
export function getContextMessages(sessionId: string): Message[] {
    const state = getConversation(sessionId)
    return state.messages
}

/**
 * Update system context for a session
 */
export function updateSystemContext(
    sessionId: string,
    context: SystemContext
): void {
    const state = getConversation(sessionId)
    state.systemContext = context
}

/**
 * Get system context for a session
 */
export function getSystemContext(sessionId: string): SystemContext | undefined {
    const state = getConversation(sessionId)
    return state.systemContext
}

/**
 * Clear a conversation
 */
export function clearConversation(sessionId: string): void {
    conversationStore.delete(sessionId)
}

/**
 * Get conversation metadata
 */
export function getConversationMetadata(sessionId: string) {
    const state = conversationStore.get(sessionId)
    return state?.metadata
}

/**
 * Inject tool results into the next AI context
 * This allows the AI to see what tools have produced
 */
export function injectToolResult(
    sessionId: string,
    toolName: string,
    result: string
): void {
    const toolMessage: Message = {
        id: `tool-${Date.now()}`,
        role: 'system',
        content: `[Tool: ${toolName}]\n${result}`,
        created_at: new Date().toISOString(),
        metadata: {
            reasoning: `Tool execution result from ${toolName}`,
        },
    }

    addMessage(sessionId, toolMessage)
}
