/**
 * Gemini API Client
 * Real AI inference using Google's Gemini API
 * NO mock responses, NO templates, NO hardcoded data
 */

import { Message, Mode, SystemContext } from '@/types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'

interface GeminiMessage {
    role: 'user' | 'model'
    parts: { text: string }[]
}

interface GeminiRequest {
    contents: GeminiMessage[]
    systemInstruction?: { parts: { text: string }[] }
    generationConfig?: {
        temperature?: number
        topP?: number
        topK?: number
        maxOutputTokens?: number
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

function getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new GeminiError('GEMINI_API_KEY environment variable is not set', 401)
    }
    return apiKey
}

function convertToGeminiMessages(messages: Message[]): GeminiMessage[] {
    return messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))
}

function buildSystemPrompt(mode: Mode, context?: SystemContext): string {
    // Unified Linux Expert system prompt that adapts to mode
    const basePrompt = `You are LinuxExpert AI, a senior Linux systems administrator and troubleshooter with 10+ years of experience. You help users solve real Linux problems with practical, executable solutions.

## Reasoning Protocol (Chain of Thought)
Before answering, you must internally:
1. **Analyze the Request**: Identify the user's underlying goal, not just the surface question.
2. **Safety Check**: Verify if the requested operation is destructive (rm -rf, format, etc.).
3. **Context Check**: Consider the user's distro (Arch vs Ubuntu) and current session context.
4. **Formulate Plan**: Determine the best, safest, and most modern approach.

## Your Expertise
- System administration (package management, services, networking)
- Troubleshooting (logs, debugging, performance issues)
- Security hardening and best practices
- Shell scripting and automation
- Both Debian/Ubuntu-based and Arch-based distributions

## Response Guidelines
1. **Be practical** - Provide real commands that users can execute
2. **Explain risks** - Warn about potentially dangerous operations
3. **Include context** - Explain why a solution works, not just what to do
4. **Format properly** - Use \`\`\`bash for shell commands, include file paths for configs
5. **Be thorough** - Cover edge cases and potential issues
6. **Thinking Process** - If the problem is complex, briefly explain your diagnosis methodology first.`

    // Mode-specific behavior injection
    const modeContext = mode === 'arch'
        ? `
## Current Mode: Arch Linux
- **Package Management**: Prioritize \`pacman\` and \`yay\`.
- **Philosophy**: Follow "The Arch Way" (User-centric, simplicity, versatility).
- **Resources**: Reference the Arch Wiki for deep dives.
- **Safety**: WARN deeply about partial upgrades. Always recommend \`pacman -Syu\`.
- **Style**: Direct, technical, savvy. (Indonesian tech slang allowed: lu/gw, btw, sikat, aman).`
        : `
## Current Mode: Ubuntu/Debian server
- **Package Management**: Prioritize \`apt\` and \`snap\` (if appropriate).
- **Philosophy**: Stability and reliability (LTS focus).
- **Safety**: Suggest \`--dry-run\` where applicable.
- **Style**: Professional, helpful, enterprise-ready.`

    // System context injection if available
    let systemContextStr = ''
    if (context) {
        systemContextStr = `
## User's System Context
- **Distro**: ${context.distro_type}
- **Kernel**: ${context.kernel_version}
- **DE/WM**: ${context.de_wm}
- **GPU**: ${context.gpu}
${context.packages ? `- **Relevant Packages**: ${context.packages}` : ''}`
    }

    return `${basePrompt}${modeContext}${systemContextStr}`
}

/**
 * Stream chat completion from Gemini API
 * Yields text chunks as they arrive from the model
 */
export async function* streamChatCompletion(
    messages: Message[],
    mode: Mode,
    context?: SystemContext
): AsyncGenerator<{ text: string; done: boolean }> {
    const apiKey = getApiKey()

    const systemPrompt = buildSystemPrompt(mode, context)
    const geminiMessages = convertToGeminiMessages(messages)

    if (geminiMessages.length === 0) {
        throw new GeminiError('No valid messages to process')
    }

    const requestBody: GeminiRequest = {
        contents: geminiMessages,
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
        },
    }

    const response = await fetch(`${GEMINI_API_URL}?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new GeminiError(
            `Gemini API request failed: ${response.status}`,
            response.status,
            errorText
        )
    }

    if (!response.body) {
        throw new GeminiError('No response body received')
    }

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

            // Process SSE events
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim()

                    if (!data || data === '[DONE]') {
                        continue
                    }

                    try {
                        const chunk: GeminiStreamChunk = JSON.parse(data)

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
                        // Skip malformed JSON, continue processing
                        if (parseError instanceof GeminiError) {
                            throw parseError
                        }
                        console.warn('Failed to parse Gemini chunk:', data)
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
