import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RATE LIMITER
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const LIMIT = 20;
const WINDOW = 60 * 1000;

// GUARDRAILS
const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//,
    /mkfs\.\w+/,
    /dd\s+if=.*of=\/dev\/(sda|hd|disk|nvme)/,
    /:\(\)\s*{\s*:\|:&\s*};:/,
    /wget.*\|\s*(sh|bash)/,
    /curl.*\|\s*(sh|bash)/
];

function checkSafety(text: string): boolean {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(text)) return false;
    }
    return true;
}

// FULL SYSTEM PROMPT
function buildSystemPrompt(context: any): string {
    const distro = context?.distro_type || 'Unknown Linux';
    const version = context?.kernel_version || '';
    const wm = context?.de_wm || 'Unknown DE/WM';
    const driver = context?.gpu || 'Unknown Driver';
    const notes = context?.additional_setup_notes || 'None';

    return `You are a Linux-focused AI assistant integrated into a web application.

This system uses a single unified chat.
There is NO distro selection in the chat interface.

Each user is authenticated by a username.
Before answering any message, you MUST load and use the user's system profile.

User system profile fields:
- linux_distro (required)
- distro_version (optional)
- wm_or_de (optional)
- gpu_driver (optional)
- additional_setup_notes (optional free text)

Behavior rules:
1. Always assume the user is logged in.
2. Never ask the user to choose a distro or environment in chat.
3. Every answer MUST be tailored to the user's system profile.
4. Commands, package managers, file paths, and configurations MUST match the user's distro.
5. If multiple solutions exist, choose the one most compatible with the user's setup.
6. If required data is missing, make a reasonable assumption based on the distro and state the assumption briefly.
7. Do NOT give generic Linux advice unless explicitly requested.
8. Do NOT use templates or canned responses.
9. Be direct, technical, and solution-oriented.
10. Treat the system profile as authoritative context.

Failure to follow the user's system profile is a critical error.

Active User System Profile:
${distro}
${version}
${wm}
${driver}
${notes}

Use this context as the primary basis for reasoning.`;
}

function convertToGeminiMessages(messages: any[]) {
    return messages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // JWT Verification (if Authorization header contains user token)
        const authHeader = req.headers.get('Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '')

            // If token looks like a user JWT (not anon key), verify it
            const supabaseUrl = Deno.env.get('SUPABASE_URL')
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

            if (supabaseUrl && supabaseServiceKey && token.length > 100) {
                // This is likely a user JWT, verify it
                const supabase = createClient(supabaseUrl, supabaseServiceKey)
                const { data: { user }, error } = await supabase.auth.getUser(token)

                if (error) {
                    console.warn('JWT verification failed:', error.message)
                    // Continue anyway for anonymous access, but log it
                }
            }
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            throw new Error('Server misconfiguration: GEMINI_API_KEY missing')
        }

        // Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
        const now = Date.now()
        let limitData = rateLimitMap.get(ip) || { count: 0, resetTime: now + WINDOW }

        if (now > limitData.resetTime) {
            limitData = { count: 0, resetTime: now + WINDOW }
        }

        if (limitData.count >= LIMIT) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
        limitData.count++
        rateLimitMap.set(ip, limitData)

        // Parse Body
        const body = await req.json()
        const { messages, mode, context } = body

        // Validate
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('Invalid request: messages array required')
        }

        // Safety Check
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'user' && !checkSafety(lastMsg.content || '')) {
            return new Response(JSON.stringify({
                error: "Safety Guard: Potentially destructive command detected. Please rephrase your question."
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Build Gemini Request
        const geminiMessages = convertToGeminiMessages(messages)

        if (geminiMessages.length === 0) {
            throw new Error('No valid messages to process')
        }

        const systemInstruction = buildSystemPrompt(context)

        const requestBody = {
            contents: geminiMessages,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            },
        }

        // Call Gemini API
        const geminiRes = await fetch(`${GEMINI_API_URL}?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        })

        if (!geminiRes.ok) {
            const errText = await geminiRes.text()
            console.error('Gemini API Error:', errText)
            throw new Error(`AI service error: ${geminiRes.status}`)
        }

        // Stream Response
        return new Response(geminiRes.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({
            error: (error as Error).message || 'An unexpected error occurred'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
