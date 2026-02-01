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

    // Direct fetch to Edge Function (Universal - works on Client & Server)
    const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
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
                yield { text: '', done: true }
                break
            }

            buffer += decoder.decode(value, { stream: true })

            // Process SSE events (Gemini format preserved by Edge Function)
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim() // Renamed to avoid collision with 'data' var

                    if (!dataStr || dataStr === '[DONE]') {
                        continue
                    }

                    try {
                        const chunk: GeminiStreamChunk = JSON.parse(dataStr)

                        if (chunk.error) {
                            throw new GeminiError(
                                chunk.error.message,
                                chunk.error.code
                            )
                        }

                        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
                        if (text) {
                            yield { text, done: false }
                        }

                        const finishReason = chunk.candidates?.[0]?.finishReason
                        if (finishReason && finishReason !== 'STOP') {
                            console.warn(`Gemini finish reason: ${finishReason}`)
                        }
                    } catch (parseError) {
                        if (parseError instanceof GeminiError) {
                            throw parseError
                        }
                        // Ignore malformed JSON chunks from stream
                        console.warn('Failed to parse stream chunk:', dataStr)
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
