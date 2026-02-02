/**
 * Gemini API Client (Supabase Edge Function Proxy)
 * Securely routes AI requests through Supabase Edge Functions
 * NO API keys exposed on client
 */

import { Message, Mode, SystemContext } from '@/types'

export class GeminiError extends Error {
    constructor(
        message: string,
        public code?: number,
        public details?: string
    ) {
        super(message)
        this.name = 'GeminiError'
    }
}

interface GeminiStreamChunk {
    candidates?: {
        content?: {
            parts?: { text: string }[]
        }
        finishReason?: string
    }[]
    error?: {
        code: number
        message: string
    }
}

/**
 * Stream chat completion from Supabase Edge Function
 * Yields text chunks as they arrive from the model (via Edge Function proxy)
 */
import { supabase } from '@/lib/supabase/client'

export async function* streamChatCompletion(
    messages: Message[],
    mode: Mode,
    context?: SystemContext
): AsyncGenerator<{ text: string; done: boolean }> {

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new GeminiError('Supabase configuration missing', 500)
    }

    // Get user's JWT token from Supabase session
    const { data: { session } } = await supabase.auth.getSession()

    // Use user's JWT token if available, otherwise use anon key
    const authToken = session?.access_token || supabaseAnonKey

    // Direct fetch to Edge Function (Universal - works on Client & Server)
    const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
            messages,
            mode,
            context
        })
    })

    if (!response.ok) {
        let errText = ''
        try {
            errText = await response.text()
        } catch (e) { errText = response.statusText }

        throw new GeminiError(`Edge Function Error: ${response.status} ${errText}`, response.status)
    }

    if (!response.body) {
        throw new GeminiError('No response body received', 500)
    }

    // 'data' is a ReadableStream (browser API)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                // Process any remaining buffer content
                if (buffer.trim()) {
                    const line = buffer.trim()
                    if (line.startsWith('data: ')) {
                        // ... existing parse logic ...
                        try {
                            const dataStr = line.slice(6).trim()
                            if (dataStr && dataStr !== '[DONE]') {
                                const chunk = JSON.parse(dataStr)
                                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
                                if (text !== undefined) yield { text, done: false }
                            }
                        } catch (e) { console.error('Error parsing final chunk', e) }
                    } else if (line.startsWith('{') || line.startsWith('[')) {
                        // Fallback: Try parsing raw JSON (error response?)
                        try {
                            const json = JSON.parse(line)
                            if (json.error) {
                                yield { text: `\n⚠️ Content Error: ${json.error.message || 'Unknown error'}`, done: false }
                            }
                        } catch (e) { }
                    }
                }

                yield { text: '', done: true }
                break
            }

            buffer += decoder.decode(value, { stream: true })

            // Robust SSE parsing: process line by line
            let newlineIndex: number
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newlineIndex).trim()
                buffer = buffer.slice(newlineIndex + 1)

                if (!line) continue

                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim()

                    if (!dataStr || dataStr === '[DONE]') {
                        continue
                    }

                    try {
                        const chunk: GeminiStreamChunk = JSON.parse(dataStr)

                        if (chunk.error) {
                            console.error('Gemini Stream Error:', chunk.error)
                            yield { text: `\n[Error: ${chunk.error.message}]`, done: false }
                            continue
                        }

                        const candidate = chunk.candidates?.[0]

                        // Handle Safety Filters
                        if (candidate?.finishReason === 'SAFETY') {
                            yield { text: "\n⚠️ Content blocked by safety settings.", done: false }
                            continue
                        }

                        const text = candidate?.content?.parts?.[0]?.text

                        // Explicitly check for undefined, as empty string "" is valid text
                        if (text !== undefined) {
                            yield { text, done: false }
                        }

                        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                            console.warn(`Gemini finish reason: ${candidate.finishReason}`)
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse stream chunk:', dataStr)
                    }
                } else {
                    // Log non-SSE lines for debugging (might be raw error JSON)
                    console.warn('Received non-SSE line:', line.substring(0, 100))

                    // Try to parse as raw error if it looks like JSON
                    if (line.startsWith('{')) {
                        try {
                            const json = JSON.parse(line)
                            if (json.error || json.message) {
                                const msg = json.error?.message || json.message || 'Unknown error';
                                yield { text: `\n⚠️ Error: ${msg}`, done: false }
                            }
                        } catch (e) { }
                    }
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}

/**
 * Non-streaming chat completion for simple requests
 */
export async function chatCompletion(
    messages: Message[],
    mode: Mode,
    context?: SystemContext
): Promise<string> {
    let fullResponse = ''

    for await (const chunk of streamChatCompletion(messages, mode, context)) {
        if (!chunk.done) {
            fullResponse += chunk.text
        }
    }

    return fullResponse
}
