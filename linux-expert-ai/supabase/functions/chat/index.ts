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
function buildSystemPrompt(mode: string, context: any): string {
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
6. **Thinking Process** - If the problem is complex, briefly explain your diagnosis methodology first.`;

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
- **Style**: Professional, helpful, enterprise-ready.`;

    let systemContextStr = '';
    if (context) {
        systemContextStr = `

## User's System Context
- **Distro**: ${context.distro_type || 'Unknown'}
- **Kernel**: ${context.kernel_version || 'Unknown'}
- **DE/WM**: ${context.de_wm || 'Unknown'}
- **GPU**: ${context.gpu || 'Unknown'}
${context.packages ? `- **Relevant Packages**: ${context.packages}` : ''}`;
    }

    return basePrompt + modeContext + systemContextStr;
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

        const systemInstruction = buildSystemPrompt(mode || 'ubuntu', context)

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
            error: error.message || 'An unexpected error occurred'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
