/**
 * AI Orchestrator
 * Main coordination layer for processing user messages
 * This is the central hub that connects:
 * - User input
 * - Conversation memory
 * - AI inference (Gemini)
 * - Tool execution
 * - Response generation
 */

import { Message, Mode, SystemContext, SafetyAnalysis } from '@/types'
import { streamChatCompletion, GeminiError } from './gemini'
import { getContextMessages, addMessage, getSystemContext } from './memory'
import { analyzeTextForSafety, extractCommandsFromText } from '../commands'

export interface ProcessMessageOptions {
    sessionId: string
    message: Message
    mode: Mode
    systemContext?: SystemContext
}

export interface StreamChunk {
    type: 'metadata' | 'content' | 'error' | 'done'
    content?: string
    metadata?: {
        mode: Mode
        safetyLevel: SafetyAnalysis['level']
        detectedCommands: boolean
        sessionId: string
    }
    error?: string
}

/**
 * Process a user message and stream the AI response
 * This is the main entry point for chat processing
 */
export async function* processMessage(
    options: ProcessMessageOptions
): AsyncGenerator<StreamChunk> {
    const { sessionId, message, mode, systemContext } = options

    // Validate input
    if (!message.content || typeof message.content !== 'string') {
        yield {
            type: 'error',
            error: 'Invalid message content',
        }
        return
    }

    // Analyze safety of the user's message
    const safetyAnalysis = analyzeTextForSafety(message.content)
    const detectedCommands = extractCommandsFromText(message.content)

    // Send initial metadata
    yield {
        type: 'metadata',
        metadata: {
            mode,
            safetyLevel: safetyAnalysis.level,
            detectedCommands: detectedCommands.length > 0,
            sessionId,
        },
    }

    // Add user message to conversation history
    addMessage(sessionId, message)

    // Get conversation context
    const contextMessages = getContextMessages(sessionId)
    const sessionContext = systemContext || getSystemContext(sessionId)

    try {
        // Stream response from Gemini
        const stream = streamChatCompletion(contextMessages, mode, sessionContext)

        let fullResponse = ''

        for await (const chunk of stream) {
            if (chunk.done) {
                // Save assistant message to history
                const assistantMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: fullResponse,
                    created_at: new Date().toISOString(),
                    metadata: {
                        safetyLevel: safetyAnalysis.level,
                        detectedCommands: detectedCommands,
                    },
                }
                addMessage(sessionId, assistantMessage)

                yield { type: 'done' }
                break
            }

            fullResponse += chunk.text
            yield {
                type: 'content',
                content: chunk.text,
            }
        }
    } catch (error) {
        console.error('Orchestrator error:', error)

        if (error instanceof GeminiError) {
            yield {
                type: 'error',
                error: `AI processing failed: ${error.message}`,
            }
        } else {
            yield {
                type: 'error',
                error: 'An unexpected error occurred while processing your request',
            }
        }
    }
}

/**
 * Process a message and return the complete response
 * Non-streaming version for simple use cases
 */
export async function processMessageSync(
    options: ProcessMessageOptions
): Promise<{ response: string; metadata: StreamChunk['metadata'] }> {
    let response = ''
    let metadata: StreamChunk['metadata'] | undefined

    for await (const chunk of processMessage(options)) {
        if (chunk.type === 'metadata') {
            metadata = chunk.metadata
        } else if (chunk.type === 'content' && chunk.content) {
            response += chunk.content
        } else if (chunk.type === 'error') {
            throw new Error(chunk.error)
        }
    }

    return {
        response,
        metadata: metadata!,
    }
}
