import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processMessage, StreamChunk } from '@/lib/ai/orchestrator'
import { analyzeTextForSafety, extractCommandsFromText } from '@/lib/commands'
import { Mode, Message, SystemContext } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  messages: Message[]
  mode?: Mode // Legacy mode support, optional
  context?: SystemContext // New profile context
  session_id?: string
}

/**
 * Validate and sanitize user input
 */
function validateRequest(body: ChatRequest): {
  valid: boolean
  error?: string
} {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'Invalid request: messages array required' }
  }

  // Validate message content - only require content for user messages
  for (const msg of body.messages) {
    // User messages must have content
    if (msg.role === 'user' && (!msg.content || typeof msg.content !== 'string')) {
      return { valid: false, error: 'Invalid message format: user messages require content' }
    }

    // All messages with content must be strings
    if (msg.content && typeof msg.content !== 'string') {
      return { valid: false, error: 'Invalid message format: content must be string' }
    }

    // Limit message size to prevent abuse (only if content exists)
    if (msg.content && msg.content.length > 50000) {
      return { valid: false, error: 'Message too long (max 50000 characters)' }
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    // Validate request
    const validation = validateRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { messages, mode: explicitMode, context, session_id } = body

    // Infer mode from context if not provided
    let mode: Mode = 'arch' // default
    if (explicitMode) {
      mode = explicitMode
    } else if (context?.distro_type) {
      const distro = context.distro_type.toLowerCase()
      if (distro.includes('ubuntu') || distro.includes('debian') || distro.includes('mint')) {
        mode = 'ubuntu'
      }
    }

    // Get or create session ID
    const currentSessionId = session_id || uuidv4()

    // Get last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message found' },
        { status: 400 }
      )
    }

    // Create stream using real AI orchestrator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = processMessage({
            sessionId: currentSessionId,
            message: {
              id: lastUserMessage.id || uuidv4(),
              role: 'user',
              content: lastUserMessage.content,
              created_at: new Date().toISOString(),
            },
            mode,
            systemContext: context,
          })

          for await (const chunk of messageStream) {
            const data = formatSSEData(chunk)
            controller.enqueue(new TextEncoder().encode(data))

            if (chunk.type === 'done' || chunk.type === 'error') {
              break
            }
          }

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)

          // Send error to client
          const errorData = formatSSEData({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          })
          controller.enqueue(new TextEncoder().encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Session-ID': currentSessionId,
      },
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Format chunk for Server-Sent Events
 */
function formatSSEData(chunk: StreamChunk): string {
  if (chunk.type === 'done') {
    return `data: [DONE]\n\n`
  }

  return `data: ${JSON.stringify(chunk)}\n\n`
}

/**
 * Save message to database after streaming
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const { session_id, message } = await request.json()

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate message before saving
    if (!message.role || !message.content) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    const { error } = await (supabase.from('messages') as any).insert({
      session_id,
      role: message.role,
      content: message.content,
      metadata: message.metadata,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error saving message:', error)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
